import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// Google Gemini API configuration
// 注意：在 Vercel 上，环境变量需要在运行时读取，而不是在模块加载时
const getGeminiConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return { apiKey, model, apiUrl };
};
  
const BUILDING_TYPE_CONTEXT: Record<string, string> = {
  residential: 'residential building, housing, apartment complex, villa',
  public: 'public building, civic architecture, cultural facility, museum, library',
  commercial: 'commercial building, office tower, retail complex, mixed-use development',
  landscape: 'landscape design, outdoor space, park, garden, plaza',
  interior: 'interior space, room design, indoor environment',
};

interface GenerateRequest {
  referenceImage: string;      // base64 — style source
  architectureDrawing: string; // base64 — geometry source
  buildingType: string;
  location?: string;
  prompt?: string;
  strength: number;
}

// Helper function to make HTTPS request with better error handling and proxy support
function makeHttpsRequest(url: string, options: any, data: string): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Get proxy from environment variables
    // 注意：在 Vercel 生产环境中不使用代理，只在本地开发时使用
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const proxyUrl = isVercel 
      ? undefined  // Vercel 上不使用代理
      : (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 
         process.env.https_proxy || process.env.http_proxy);
    
    console.log('Proxy check:', {
      isVercel,
      HTTPS_PROXY: process.env.HTTPS_PROXY ? 'Set' : 'Not set',
      HTTP_PROXY: process.env.HTTP_PROXY ? 'Set' : 'Not set',
      proxyUrl: proxyUrl || 'Not set'
    });
    
    let agent: any = undefined;
    if (proxyUrl && !isVercel) {
      try {
        // 仅在本地开发时动态加载代理
        const { HttpsProxyAgent } = require('https-proxy-agent');
        agent = new HttpsProxyAgent(proxyUrl);
        console.log('✅ Using proxy:', proxyUrl.replace(/:[^:@]*@/, ':****@')); // Hide password
      } catch (e) {
        console.warn('❌ Failed to create proxy agent:', e);
        // 如果代理创建失败，继续使用直接连接
      }
    } else {
      console.log(isVercel ? '✅ Vercel environment - direct connection (no proxy)' : '⚠️  No proxy configured - direct connection');
    }
    
    const requestOptions: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: options.headers || {},
      timeout: 120000, // 120 seconds (图片生成可能需要更长时间)
    };
    
    if (agent) {
      requestOptions.agent = agent;
    }

    const req = https.request(requestOptions, (res) => {
      let body = '';
      console.log('Received response from Gemini API:', {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      });
      
      res.on('data', (chunk) => {
        body += chunk;
        console.log(`Received ${chunk.length} bytes, total: ${body.length} bytes`);
      });
      
      res.on('end', () => {
        console.log(`Response complete. Total body size: ${body.length} bytes`);
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers,
          body: body
        });
      });
      
      res.on('error', (error: any) => {
        console.error('Response error:', error);
        reject(new Error(`响应错误: ${error.message}`));
      });
      
      res.on('close', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          // 正常关闭，已经在 'end' 事件中处理
        } else {
          console.warn('Response closed unexpectedly');
        }
      });
    });

    req.on('error', (error: any) => {
      console.error('Request error:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      });
      reject(error);
    });

    req.on('timeout', () => {
      console.error('Request timeout after 120 seconds');
      req.destroy();
      reject(new Error('Request timeout - 图片生成可能需要更长时间，请稍后重试'));
    });

    // 写入数据时处理错误
    if (data) {
      try {
        const writeResult = req.write(data);
        if (!writeResult) {
          // 如果缓冲区已满，等待 drain 事件
          req.once('drain', () => {
            console.log('Request buffer drained, continuing...');
          });
        }
      } catch (writeError: any) {
        console.error('Exception while writing data:', writeError);
        req.destroy();
        reject(writeError);
        return;
      }
    }
    
    // 结束请求
    req.end((error: any) => {
      if (error) {
        console.error('Error ending request:', error);
        reject(error);
      } else {
        console.log('Request sent successfully, waiting for response...');
      }
    });
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // 在运行时读取环境变量（确保在 Vercel 上正确获取）
    const { apiKey: GEMINI_API_KEY, model: MODEL, apiUrl: GEMINI_API_URL } = getGeminiConfig();
    
    console.log('=== Generate API Called ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
    console.log('GEMINI_API_KEY length:', GEMINI_API_KEY.length);
    console.log('MODEL:', MODEL);

    const body: GenerateRequest = await request.json();
    console.log('Request body received:', {
      hasReferenceImage: !!body.referenceImage,
      hasArchitectureDrawing: !!body.architectureDrawing,
      buildingType: body.buildingType,
      location: body.location,
      hasPrompt: !!body.prompt,
      strength: body.strength,
    });
    const { referenceImage, architectureDrawing, buildingType, location, prompt, strength } = body;

    if (!referenceImage || !architectureDrawing) {
      return NextResponse.json(
        { error: 'Both referenceImage and architectureDrawing are required' },
        { status: 400 }
      );
    }

    // Build dual-image prompt
    const buildingContext = BUILDING_TYPE_CONTEXT[buildingType] || 'building';
    const locationContext = location ? ` set in a ${location} environment,` : '';
    const styleAdherence = strength > 0.75 ? 'very closely match' : strength > 0.5 ? 'closely follow' : 'loosely reference';
    const fullPrompt = `You are given two images: the FIRST image is a reference rendering (style/mood source), the SECOND image is an architectural drawing/sketch/model (geometry source).

Generate a professional architectural rendering of a ${buildingContext}${locationContext} by:
1. Preserving the exact spatial geometry, massing, proportions and structural layout from the SECOND image (architecture drawing)
2. ${styleAdherence} the visual style, lighting, atmosphere, materials and color palette from the FIRST image (reference)
3. Producing photorealistic quality: accurate shadows, realistic materials, professional composition

${prompt ? `Additional requirements: ${prompt}\n` : ''}Output: a single high-quality architectural visualization image.`;

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { 
          error: 'Gemini API Key 未配置',
          details: '要使用渲染功能，请按以下步骤配置：\n1. 访问 https://aistudio.google.com/apikey 获取 API Key\n2. 在 .env.local 文件中取消注释并填入：\n   GEMINI_API_KEY=你的API密钥\n3. 重启开发服务器（npm run dev）',
          helpUrl: 'https://aistudio.google.com/apikey'
        },
        { status: 500 }
      );
    }

    // Extract base64 data from both images
    const parseDataUrl = (dataUrl: string, label: string) => {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error(`Invalid ${label} format`);
      return { mimeType: m[1], data: m[2] };
    };

    const ref = parseDataUrl(referenceImage, 'referenceImage');
    const drawing = parseDataUrl(architectureDrawing, 'architectureDrawing');

    console.log("MODEL:", MODEL);
    console.log("API URL:", GEMINI_API_URL);
    console.log("Reference image size:", ref.data.length, "bytes");
    console.log("Drawing image size:", drawing.data.length, "bytes");

    // Prepare request data — reference image first, drawing second
    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            { text: fullPrompt },
            { inlineData: { mimeType: ref.mimeType, data: ref.data } },
            { inlineData: { mimeType: drawing.mimeType, data: drawing.data } },
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],  // 仅图片输出，提高效率
        temperature: 1.0,                // 官方推荐基础值
        topP: 0.9,                      // 平衡多样性与稳定性
        topK: 40,                       // 限制随机性过大
      }
    });

    // Call Google Gemini API using native https module with retry mechanism
    let apiResponse;
    const maxRetries = 2; // 最多重试 2 次
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`重试第 ${attempt} 次...`);
          // 等待一段时间再重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        const apiCallStartTime = Date.now();
        console.log(`调用 Gemini API (尝试 ${attempt + 1}/${maxRetries + 1})...`);
        console.log('API call start time:', new Date().toISOString());
        // 重新获取配置以确保使用最新的环境变量
        const { apiUrl } = getGeminiConfig();
        apiResponse = await makeHttpsRequest(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
            'Content-Length': Buffer.byteLength(requestData)
          }
        }, requestData);
        
        const apiCallDuration = Date.now() - apiCallStartTime;
        console.log("API Response status:", apiResponse.statusCode);
        console.log(`API call duration: ${apiCallDuration}ms (${(apiCallDuration / 1000).toFixed(2)}s)`);
        // 成功则跳出重试循环
        break;
      } catch (fetchError: any) {
        lastError = fetchError;
        console.error(`HTTPS request error (尝试 ${attempt + 1}/${maxRetries + 1}):`, {
          name: fetchError?.name,
          message: fetchError?.message,
          code: fetchError?.code,
          errno: fetchError?.errno,
          syscall: fetchError?.syscall
        });
        
        // 如果是最后一次尝试，或者错误不是可重试的错误，则抛出错误
        if (attempt === maxRetries) {
          // 最后一次尝试失败，准备返回错误
          break;
        }
        
        // 如果是 socket hang up 或连接错误，可以重试
        const isRetryable = fetchError.message?.includes('socket hang up') || 
                           fetchError.message?.includes('ECONNRESET') ||
                           fetchError.code === 'ECONNRESET' ||
                           fetchError.message?.includes('ETIMEDOUT') ||
                           fetchError.code === 'ETIMEDOUT';
        
        if (!isRetryable) {
          // 不可重试的错误，直接抛出
          break;
        }
      }
    }
    
    // 如果所有重试都失败
    if (!apiResponse) {
      const fetchError = lastError;
      // 记录详细错误信息用于调试
      console.error('=== API 调用失败详情 ===');
      console.error('Error object:', JSON.stringify({
        message: fetchError?.message,
        code: fetchError?.code,
        errno: fetchError?.errno,
        syscall: fetchError?.syscall,
        stack: fetchError?.stack
      }, null, 2));
      
      // 提供更详细的错误信息
      let errorDetails = `网络错误: ${fetchError?.message || '未知错误'}`;
      let errorTitle = '无法连接到 Gemini API';
      
      if (fetchError?.message?.includes('ENOTFOUND') || fetchError?.message?.includes('getaddrinfo')) {
        errorDetails = 'DNS 解析失败，无法连接到 Google API 服务器。Vercel 服务器可能无法访问 Google API。';
        errorTitle = 'DNS 解析失败';
      } else if (fetchError?.message?.includes('ECONNREFUSED') || fetchError?.code === 'ECONNREFUSED') {
        errorDetails = '连接被拒绝。可能是防火墙或网络限制问题。';
        errorTitle = '连接被拒绝';
      } else if (fetchError?.message?.includes('ETIMEDOUT') || fetchError?.code === 'ETIMEDOUT' || fetchError?.message?.includes('timeout')) {
        errorDetails = '连接超时。Vercel 服务器无法在120秒内连接到 Google API 服务器。';
        errorTitle = '连接超时';
      } else if (fetchError?.message?.includes('certificate') || fetchError?.message?.includes('SSL')) {
        errorDetails = 'SSL 证书验证失败。请检查系统时间是否正确。';
        errorTitle = 'SSL 证书错误';
      } else if (fetchError?.code === 'ENOTFOUND' || fetchError?.errno === 'ENOTFOUND') {
        errorDetails = '无法解析域名 generativelanguage.googleapis.com。Vercel 服务器可能无法访问 Google API。';
        errorTitle = '域名解析失败';
      } else if (fetchError?.message?.includes('socket hang up') || fetchError?.code === 'ECONNRESET') {
        errorDetails = '连接被意外关闭（socket hang up）。可能是网络中断或请求过大。已重试多次。';
        errorTitle = '连接中断';
      }
      
      return NextResponse.json(
        { 
          error: errorTitle, 
          details: `${errorDetails}\n\n错误代码: ${fetchError?.code || 'N/A'}\n错误信息: ${fetchError?.message || 'N/A'}\n\n请检查 Vercel 函数日志获取更多详细信息。`,
          debug: {
            errorCode: fetchError?.code,
            errorMessage: fetchError?.message,
            errorName: fetchError?.name
          }
        },
        { status: 503 }
      );
    }

    if (apiResponse.statusCode !== 200) {
      console.error('Gemini API error:', apiResponse.body);
      return NextResponse.json(
        { error: 'Failed to generate rendering', details: apiResponse.body },
        { status: apiResponse.statusCode }
      );
    }

    let result;
    try {
      result = JSON.parse(apiResponse.body);
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      return NextResponse.json(
        { error: 'Invalid API response format', details: '无法解析 API 响应' },
        { status: 500 }
      );
    }
    
    // 记录 Token 使用情况
    const usageMetadata = result.usageMetadata || result.usage || {};
    const tokenUsage = {
      timestamp: new Date().toISOString(),
      model: MODEL,
      inputTokens: usageMetadata.promptTokenCount || usageMetadata.input_tokens || usageMetadata.inputTokens || 0,
      outputTokens: usageMetadata.candidatesTokenCount || usageMetadata.output_tokens || usageMetadata.outputTokens || 0,
      totalTokens: usageMetadata.totalTokenCount || usageMetadata.total_tokens || usageMetadata.totalTokens || 0,
      userId: 'anonymous',
      buildingType,
      strength,
    };
    
    // 记录到控制台（开发环境）
    console.log('📊 Token Usage:', JSON.stringify(tokenUsage, null, 2));
    
    // 记录到日志文件（仅在非 Vercel 环境）
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    if (!isVercel) {
      try {
        const logDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logDir, 'token-usage.log');
        
        // 确保日志目录存在
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        // 追加日志到文件（JSON Lines 格式，每行一个 JSON 对象）
        const logEntry = JSON.stringify(tokenUsage) + '\n';
        fs.appendFileSync(logFile, logEntry, 'utf8');
        console.log(`✅ Token usage logged to: ${logFile}`);
      } catch (logError) {
        console.error('❌ Failed to write token usage log:', logError);
        // 即使日志写入失败，也不影响主流程
      }
    } else {
      console.log('ℹ️  Vercel environment - skipping file log write');
    }
    
    // Extract image from Gemini response
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      );
    }

    // Find the image part in the response
    let generatedImage = null;
    for (const part of parts) {
      // Check for inlineData (new format) or inline_data (old format)
      const inline = (part as any).inlineData || (part as any).inline_data;
      if (inline?.data) {
        const imgMimeType = inline.mimeType || inline.mime_type || 'image/png';
        const imgData = inline.data;
        generatedImage = `data:${imgMimeType};base64,${imgData}`;
        break;
      }
      
      // Also check for image parts directly
      if ((part as any).image) {
        const imagePart = (part as any).image;
        if (imagePart.inlineData?.data) {
          const imgMimeType = imagePart.inlineData.mimeType || 'image/png';
          const imgData = imagePart.inlineData.data;
          generatedImage = `data:${imgMimeType};base64,${imgData}`;
          break;
        }
      }
    }

    if (!generatedImage) {
      console.error('No image found in Gemini response. Response structure:', JSON.stringify(result, null, 2));
      return NextResponse.json(
        { 
          error: 'No image in API response',
          details: 'The API did not return a generated image. Please check the API response format.'
        },
        { status: 500 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Generate API completed successfully in ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

    return NextResponse.json({
      success: true,
      result: generatedImage,
      prompt: fullPrompt,
      usage: {
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
      },
    });

  } catch (error) {
    console.error('Generate error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // 记录详细错误信息到控制台
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: errorMessage,
        // 只在开发环境显示堆栈信息
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}
