// services/imageService.js
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract bill information from image
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Object>} Extracted bill information
 */
const extractBillInfoFromImage = async (imagePath) => {
  try {
    console.log('Extracting bill information from image:', imagePath);
    
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    console.log('Image converted to base64, size:', base64Image.length);
    
    // Call OpenAI API
    console.log('Calling OpenAI API with image...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a specialized bill information extraction assistant. Your task is to extract key information from bill images.
          
          Format your response using markdown bullet points with the following structure:
          - **Vendor Name:** [Company or service provider name]
          - **Amount Paid:** [Total amount with currency symbol]
          - **Date Paid:** [Date of payment/bill date]
          - **Due Date:** [Due date if available]
          - **Bill Item:** [Description of what was purchased/paid for]
          - **Total Amount:** [Total amount with currency symbol]
          - **Category:** [Suggest a category for this bill such as Utilities, Subscriptions, Housing, Food, Transportation, Healthcare, Insurance, Entertainment, or Other]
          
          Be precise and only include information that is clearly visible in the image. If any field is not available, simply omit that bullet point entirely.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the bill information from this image:" },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 800
    });
    
    // Parse the AI response
    console.log('Received OpenAI response');
    const extractedText = response.choices[0].message.content;
    console.log('Extracted text from image:', extractedText);
    
    // Parse the markdown response into structured data
    const parsedData = parseBillExtractionResponse(extractedText);
    
    // Add the image path to the parsed data
    parsedData.imagePath = imagePath.replace(/\\/g, '/');
    
    return parsedData;
  } catch (error) {
    console.error('Error extracting bill information from image:', error);
    throw error;
  }
};

/**
 * Parse bill extraction response from OpenAI
 * @param {string} response - Markdown response from OpenAI
 * @returns {Object} Parsed bill data
 */
const parseBillExtractionResponse = (response) => {
  const result = {};
  
  // Helper function to extract values from markdown bullet points
  const extractValue = (text, field) => {
    const regex = new RegExp(`\\*\\*${field}:\\*\\* (.+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };
  
  // Extract vendor name
  const vendor = extractValue(response, 'Vendor Name');
  if (vendor) result.vendor = vendor;
  
  // Extract amount
  const amount = extractValue(response, 'Amount Paid') || extractValue(response, 'Total Amount');
  if (amount) {
    // Remove currency symbols and commas, then parse as float
    result.amount = parseFloat(amount.replace(/[$£€,]/g, ''));
  }
  
  // Extract dates
  const datePaid = extractValue(response, 'Date Paid');
  if (datePaid) result.billDate = datePaid;
  
  const dueDate = extractValue(response, 'Due Date');
  if (dueDate) result.dueDate = dueDate;
  
  // Extract bill item
  const billItem = extractValue(response, 'Bill Item');
  if (billItem) result.items = billItem;
  
  // Extract category
  const category = extractValue(response, 'Category');
  if (category) result.category = category;
  
  return result;
};

module.exports = {
  extractBillInfoFromImage,
  parseBillExtractionResponse
};