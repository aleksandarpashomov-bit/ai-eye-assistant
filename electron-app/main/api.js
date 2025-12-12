/**
 * API Module
 * Handles communication with OpenAI Vision API for image analysis
 */

const axios = require('axios');
const { log } = require('./logger');

// API configuration
let apiKey = '';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';  // Vision-capable model

/**
 * Set the OpenAI API key
 * 
 * @param {string} key - OpenAI API key
 */
function setApiKey(key) {
  apiKey = key;
}

/**
 * Analyze an image using OpenAI Vision API
 * 
 * @param {string} base64Image - Base64-encoded image data
 * @param {string} customPrompt - Optional custom analysis prompt
 * @returns {Promise<string>} Analysis result text
 */
async function analyzeImage(base64Image, customPrompt = null) {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const systemPrompt = `You are an AI assistant analyzing the user's screen. 
Your job is to:
1. Describe what you see on the screen
2. Identify any tasks or activities the user appears to be working on
3. Provide helpful suggestions or insights
4. If the user appears to be stuck or confused, offer guidance
5. Be concise but thorough

Always be helpful and proactive in your analysis.`;

  const userPrompt = customPrompt || 'Analyze this screenshot and provide helpful insights about what I\'m working on. If you see any issues or ways I could be more productive, let me know.';

  try {
    log('info', 'Sending image to OpenAI Vision API...');

    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: 'high'  // Use high detail for better analysis
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000  // 60 second timeout
      }
    );

    const result = response.data.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error('No response content from API');
    }

    log('info', 'Analysis received successfully');
    return result;

  } catch (error) {
    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Unknown API error';
      
      log('error', `API error ${status}: ${message}`);
      
      switch (status) {
        case 401:
          throw new Error('Invalid API key. Please check your OpenAI API key in Settings.');
        case 429:
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        case 500:
        case 502:
        case 503:
          throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
        default:
          throw new Error(`API error: ${message}`);
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error. Please check your internet connection.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw error;
  }
}

/**
 * Test API connection with a simple request
 * 
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  try {
    await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid API key');
    }
    throw error;
  }
}

module.exports = {
  setApiKey,
  analyzeImage,
  testConnection
};
