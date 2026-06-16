const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41125;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const RELAYS_FILE = path.join(DATA_DIR, 'relays.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(RELAYS_FILE)) {
  fs.writeFileSync(RELAYS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readRelays() {
  const data = fs.readFileSync(RELAYS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeRelays(relays) {
  fs.writeFileSync(RELAYS_FILE, JSON.stringify(relays, null, 2));
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/relays', (req, res) => {
  try {
    const { secretId, content } = req.body;

    if (!secretId || !secretId.trim()) {
      return res.status(400).json({ error: '秘密ID不能为空', code: 4001 });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '接力内容不能为空', code: 4004 });
    }

    const secrets = readSecrets();
    const secret = secrets.find(s => s.id === secretId && s.status === '已宽恕');
    if (!secret) {
      return res.status(404).json({ error: '找不到对应的秘密', code: 4002 });
    }

    const relays = readRelays();
    const newRelay = {
      id: uuidv4(),
      secretId: secretId.trim(),
      content: content.trim(),
      hidden: false,
      createdAt: new Date().toISOString()
    };

    relays.push(newRelay);
    writeRelays(relays);

    res.json({
      success: true,
      message: '共鸣接力已提交',
      relay: {
        id: newRelay.id,
        secretId: newRelay.secretId,
        content: newRelay.content,
        createdAt: newRelay.createdAt
      }
    });
  } catch (error) {
    console.error('保存接力时出错:', error);
    res.status(500).json({ error: '服务器内部错误', code: 5001 });
  }
});

app.get('/api/relays/:secretId', (req, res) => {
  try {
    const { secretId } = req.params;

    if (!secretId || !secretId.trim()) {
      return res.status(400).json({ error: '秘密ID不能为空', code: 4001 });
    }

    const relays = readRelays();
    const secretRelays = relays
      .filter(r => r.secretId === secretId && !r.hidden)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(r => ({
        id: r.id,
        secretId: r.secretId,
        content: r.content,
        createdAt: r.createdAt
      }));

    res.json({
      success: true,
      relays: secretRelays,
      total: secretRelays.length
    });
  } catch (error) {
    console.error('获取接力列表时出错:', error);
    res.status(500).json({ error: '服务器内部错误', code: 5002 });
  }
});

app.get('/api/admin/relays', (req, res) => {
  try {
    const relays = readRelays();
    const secrets = readSecrets();

    const relayList = relays
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(r => {
        const secret = secrets.find(s => s.id === r.secretId);
        return {
          id: r.id,
          secretId: r.secretId,
          secretContent: secret ? secret.content : '秘密已删除',
          content: r.content,
          hidden: r.hidden,
          createdAt: r.createdAt
        };
      });

    res.json({
      success: true,
      relays: relayList,
      total: relayList.length
    });
  } catch (error) {
    console.error('管理端获取接力列表时出错:', error);
    res.status(500).json({ error: '服务器内部错误', code: 5003 });
  }
});

app.put('/api/admin/relays/:id/hide', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({ error: '接力ID不能为空', code: 4005 });
    }

    const relays = readRelays();
    const relayIndex = relays.findIndex(r => r.id === id);

    if (relayIndex === -1) {
      return res.status(404).json({ error: '找不到对应的接力', code: 4003 });
    }

    relays[relayIndex].hidden = true;
    writeRelays(relays);

    res.json({
      success: true,
      message: '接力已隐藏'
    });
  } catch (error) {
    console.error('隐藏接力时出错:', error);
    res.status(500).json({ error: '服务器内部错误', code: 5004 });
  }
});

app.put('/api/admin/relays/:id/show', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({ error: '接力ID不能为空', code: 4005 });
    }

    const relays = readRelays();
    const relayIndex = relays.findIndex(r => r.id === id);

    if (relayIndex === -1) {
      return res.status(404).json({ error: '找不到对应的接力', code: 4003 });
    }

    relays[relayIndex].hidden = false;
    writeRelays(relays);

    res.json({
      success: true,
      message: '接力已恢复显示'
    });
  } catch (error) {
    console.error('恢复接力时出错:', error);
    res.status(500).json({ error: '服务器内部错误', code: 5005 });
  }
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
