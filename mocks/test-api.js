const http = require('http');

const BASE_URL = 'http://localhost:8000';

// 简单的HTTP请求函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试健康检查接口
async function testHealth() {
  console.log('🔍 测试健康检查接口...');
  try {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (result.status === 200) {
      console.log('✅ 健康检查通过');
      console.log(`   状态: ${result.data.status}`);
      console.log(`   版本: ${result.data.version}`);
    } else {
      console.log('❌ 健康检查失败');
      console.log(`   状态码: ${result.status}`);
    }
  } catch (error) {
    console.log('❌ 健康检查错误:', error.message);
  }
  console.log('');
}

// 测试登录接口
async function testLogin() {
  console.log('🔍 测试登录接口...');
  try {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'testuser',
      password: '123456'
    });
    
    if (result.status === 200 && result.data.message === 'success') {
      console.log('✅ 登录测试通过');
      console.log(`   用户: ${result.data.user.username}`);
      console.log(`   Token: ${result.data.token.substring(0, 20)}...`);
      return result.data.token;
    } else {
      console.log('❌ 登录测试失败');
      console.log(`   状态码: ${result.status}`);
      console.log(`   消息: ${result.data.message}`);
    }
  } catch (error) {
    console.log('❌ 登录测试错误:', error.message);
  }
  console.log('');
  return null;
}

// 测试面试开始接口
async function testInterviewStart(token) {
  console.log('🔍 测试面试开始接口...');
  try {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/interview/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      directions: ['frontend_engineer']
    });
    
    if (result.status === 200 && result.data.message === 'success') {
      console.log('✅ 面试开始测试通过');
      console.log(`   会话ID: ${result.data.sessionId}`);
      console.log(`   第一个问题: ${result.data.question.substring(0, 50)}...`);
      return result.data.sessionId;
    } else {
      console.log('❌ 面试开始测试失败');
      console.log(`   状态码: ${result.status}`);
      console.log(`   消息: ${result.data.message}`);
    }
  } catch (error) {
    console.log('❌ 面试开始测试错误:', error.message);
  }
  console.log('');
  return null;
}

// 主测试函数
async function runTests() {
  console.log('========================================');
  console.log('       Mock API 服务器接口测试');
  console.log('========================================');
  console.log('');

  console.log('📋 测试清单:');
  console.log('   1. 健康检查接口 (/health)');
  console.log('   2. 用户登录接口 (/login)');
  console.log('   3. 面试开始接口 (/interview/start)');
  console.log('');

  // 等待服务器启动
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('');

  // 运行测试
  await testHealth();
  const token = await testLogin();
  
  if (token) {
    await testInterviewStart(token);
  }

  console.log('========================================');
  console.log('              测试完成');
  console.log('========================================');
  console.log('');
  console.log('💡 提示:');
  console.log('   - 如果所有测试都通过，说明Mock服务器运行正常');
  console.log('   - 如果有测试失败，请检查服务器是否正确启动');
  console.log('   - 服务器地址: http://localhost:8000');
  console.log('   - 前端应用: http://localhost:3000');
}

// 检查服务器是否可达
async function checkServerAvailable() {
  try {
    await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// 启动测试
async function main() {
  const serverAvailable = await checkServerAvailable();
  
  if (!serverAvailable) {
    console.log('❌ 无法连接到Mock服务器');
    console.log('');
    console.log('请确保:');
    console.log('1. Mock服务器已启动 (npm start)');
    console.log('2. 服务器运行在 http://localhost:8000');
    console.log('3. 没有端口冲突');
    console.log('');
    console.log('启动命令:');
    console.log('   Windows: start-mock-server.bat');
    console.log('   macOS/Linux: ./start-mock-server.sh');
    console.log('   手动启动: npm start');
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error); 