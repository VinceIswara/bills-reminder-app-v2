import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractBillInfo, createBill, createUserRecord } from '../utils/api';
import { Container, Title } from '../styles/FormStyles';
import ImageUploadComponent from '../components/ImageUploadComponent';
import BillDetailsForm from '../components/BillDetailsForm';

/**
 * AddBill component - Form for creating new bills with optional image extraction
 */
const AddBill = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  
  // State management
  const [showCamera, setShowCamera] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    dueDate: '',
    billDate: '',
    items: '',
    notes: '',
    imagePath: '',
    supabasePath: '',
    category: 'Uncategorized',
    isRecurring: false,
    recurringFrequency: 'monthly',
    recurringEndDate: ''
  });
  
  // Utility functions
  const formatDateForInput = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  }, []);

  const guessCategory = useCallback((vendorName) => {
    if (!vendorName) return 'Uncategorized';
    
    vendorName = vendorName.toLowerCase();
    
    // Common category mappings
    if (vendorName.includes('netflix') || 
        vendorName.includes('spotify') || 
        vendorName.includes('hulu') || 
        vendorName.includes('disney') ||
        vendorName.includes('supabase') ||
        vendorName.includes('aws') ||
        vendorName.includes('azure') ||
        vendorName.includes('google cloud')) {
      return 'Subscriptions';
    }
    
    if (vendorName.includes('restaurant') || 
        vendorName.includes('cafe') || 
        vendorName.includes('coffee') ||
        vendorName.includes('uber eats') ||
        vendorName.includes('doordash') ||
        vendorName.includes('grubhub')) {
      return 'Food';
    }
    
    if (vendorName.includes('electric') || 
        vendorName.includes('water') || 
        vendorName.includes('gas') ||
        vendorName.includes('internet') ||
        vendorName.includes('phone') ||
        vendorName.includes('utility')) {
      return 'Utilities';
    }
    
    if (vendorName.includes('rent') || 
        vendorName.includes('mortgage') || 
        vendorName.includes('hoa') ||
        vendorName.includes('apartment')) {
      return 'Housing';
    }
    
    return 'Uncategorized';
  }, []);

  const normalizeCategory = useCallback((categoryStr) => {
    if (!categoryStr) return 'Uncategorized';
    
    const lowerCategory = categoryStr.toLowerCase();
    
    // Map of keywords to categories
    const categoryMap = {
      'util': 'Utilities',
      'electric': 'Utilities',
      'water': 'Utilities',
      'internet': 'Utilities',
      'phone': 'Utilities',
      'wifi': 'Utilities',
      'cable': 'Utilities',
      
      'subscript': 'Subscriptions',
      'streaming': 'Subscriptions',
      'netflix': 'Subscriptions',
      'spotify': 'Subscriptions',
      'amazon': 'Subscriptions',
      'apple': 'Subscriptions',
      'google': 'Subscriptions',
      'microsoft': 'Subscriptions',
      
      'rent': 'Housing',
      'mortgage': 'Housing',
      'hoa': 'Housing',
      'housing': 'Housing',
      'apartment': 'Housing',
      'property': 'Housing',
      
      'food': 'Food',
      'grocery': 'Food',
      'restaurant': 'Food',
      'meal': 'Food',
      'dining': 'Food',
      
      'transport': 'Transportation',
      'car': 'Transportation',
      'gasoline': 'Transportation',
      'fuel': 'Transportation',
      'uber': 'Transportation',
      'lyft': 'Transportation',
      'taxi': 'Transportation',
      'bus': 'Transportation',
      'train': 'Transportation',
      
      'health': 'Healthcare',
      'medical': 'Healthcare',
      'doctor': 'Healthcare',
      'hospital': 'Healthcare',
      'pharmacy': 'Healthcare',
      'medicine': 'Healthcare',
      'dental': 'Healthcare',
      'vision': 'Healthcare',
      
      'insur': 'Insurance',
      'coverage': 'Insurance',
      'policy': 'Insurance',
      
      'entertain': 'Entertainment',
      'movie': 'Entertainment',
      'game': 'Entertainment',
      'fun': 'Entertainment',
      'concert': 'Entertainment',
      'event': 'Entertainment',
      
      'educat': 'Education',
      'school': 'Education',
      'college': 'Education',
      'university': 'Education',
      'tuition': 'Education',
      'course': 'Education',
      'class': 'Education',
      'book': 'Education',
      
      'shop': 'Shopping',
      'cloth': 'Shopping',
      'retail': 'Shopping',
      'purchase': 'Shopping',
      'online': 'Shopping'
    };
    
    // Check if the category string contains any of our keywords
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(keyword)) {
        return category;
      }
    }
    
    // Check if the category string directly matches one of our predefined categories
    const predefinedCategories = [
      'Utilities', 'Subscriptions', 'Housing', 'Food', 'Transportation',
      'Healthcare', 'Insurance', 'Entertainment', 'Education', 'Shopping', 'Other'
    ];
    
    for (const category of predefinedCategories) {
      if (lowerCategory === category.toLowerCase()) {
        return category;
      }
    }
    
    return 'Uncategorized';
  }, []);
  
  // Image processing
  const processImage = useCallback(async (file) => {
    try {
      setExtracting(true);
      setExtractionError(null);
      
      const result = await extractBillInfo(file);
      
      if (result.success) {
        // Get the extracted data
        const extractedData = result.data;
        
        // Check if extractedData is an object with bill information
        if (typeof extractedData === 'object' && extractedData !== null) {
          // Use the structured data directly
          const newFormData = {
            ...formData,
            vendor: extractedData.vendor || '',
            amount: extractedData.amount || '',
            billDate: formatDateForInput(extractedData.billDate) || '',
            dueDate: formatDateForInput(extractedData.dueDate) || formatDateForInput(extractedData.billDate) || '',
            category: extractedData.category || guessCategory(extractedData.vendor || '') || 'Uncategorized',
            items: extractedData.items || '',
            notes: extractedData.notes || '',
            imagePath: result.imagePath || '',
            supabasePath: result.supabasePath || ''
          };
          
          setFormData(newFormData);
          setExtracting(false);
          return;
        }
        
        // If response is not in the expected format, fall back to string parsing
        if (typeof extractedData !== 'string') {
          setExtractionError('The image could not be processed correctly. Please try a clearer image or enter the details manually.');
          setExtracting(false);
          return;
        }
        
        // Original text parsing logic (for backward compatibility)
        const extractedText = extractedData;
        
        // Extract information from text using regex patterns
        // eslint-disable-next-line no-useless-escape
        const vendorMatch = extractedText.match(/[\*\-]\s*\*{0,2}vendor\s*name\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) || 
                           // eslint-disable-next-line no-useless-escape
                           extractedText.match(/[\*\-]\s*\*{0,2}vendor\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i);
        
        // eslint-disable-next-line no-useless-escape
        const amountMatch = extractedText.match(/[\*\-]\s*\*{0,2}amount\s*paid\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) || 
                           // eslint-disable-next-line no-useless-escape
                           extractedText.match(/[\*\-]\s*\*{0,2}total\s*amount\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) ||
                           // eslint-disable-next-line no-useless-escape
                           extractedText.match(/[\*\-]\s*\*{0,2}amount\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i);
        
        // eslint-disable-next-line no-useless-escape
        const dueDateMatch = extractedText.match(/[\*\-]\s*\*{0,2}due\s*date\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) ||
                            // eslint-disable-next-line no-useless-escape
                            extractedText.match(/[\*\-]\s*\*{0,2}payment\s*due\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i);
        
        // eslint-disable-next-line no-useless-escape
        const billDateMatch = extractedText.match(/[\*\-]\s*\*{0,2}bill\s*date\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) || 
                             // eslint-disable-next-line no-useless-escape
                             extractedText.match(/[\*\-]\s*\*{0,2}date\s*paid\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) ||
                             // eslint-disable-next-line no-useless-escape
                             extractedText.match(/[\*\-]\s*\*{0,2}date\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i);
        
        // eslint-disable-next-line no-useless-escape
        const itemsMatch = extractedText.match(/[\*\-]\s*\*{0,2}bill\s*item\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) ||
                          // eslint-disable-next-line no-useless-escape
                          extractedText.match(/[\*\-]\s*\*{0,2}items\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i) ||
                          // eslint-disable-next-line no-useless-escape
                          extractedText.match(/[\*\-]\s*\*{0,2}payment\s*for\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i);
        
        // Clean up extracted values
        const cleanAmount = amountMatch ? amountMatch[1].replace(/[^0-9.]/g, '') : '';
        
        // Parse dates
        let billDateStr = billDateMatch ? billDateMatch[1].trim() : '';
        let dueDateStr = dueDateMatch ? dueDateMatch[1].trim() : '';
        
        // Extract category if available
        // eslint-disable-next-line no-useless-escape
        const categoryMatch = extractedText.match(/[*-]\s*\*{0,2}category\*{0,2}:?\s*\*{0,2}([^\n\*]+)\*{0,2}/i);
        let categoryStr = categoryMatch ? categoryMatch[1].trim() : 'Uncategorized';
        
        // Normalize category
        const normalizedCategory = normalizeCategory(categoryStr);
        
        setFormData({
          ...formData,
          vendor: vendorMatch ? vendorMatch[1].trim() : '',
          amount: cleanAmount,
          dueDate: formatDateForInput(dueDateStr),
          billDate: formatDateForInput(billDateStr),
          items: itemsMatch ? itemsMatch[1].trim() : '',
          notes: '',
          imagePath: result.imagePath,
          supabasePath: result.supabasePath,
          category: normalizedCategory
        });
      }
    } catch (error) {
      setExtractionError('Failed to extract information from the image. Please try again or fill in the details manually.');
    } finally {
      setExtracting(false);
    }
  }, [formData, formatDateForInput, guessCategory, normalizeCategory]);
  
  // Event handlers
  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Process the image
      processImage(file);
    }
  }, [processImage]);
  
  const handleCameraToggle = useCallback(() => {
    setShowCamera(prev => !prev);
  }, []);
  
  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      // Convert base64 to file
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          setImagePreview(imageSrc);
          setShowCamera(false);
          
          // Process the image
          processImage(file);
        });
    }
  }, [processImage]);
  
  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
  }, []);
  
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    setExtractionError(null);
    
    try {
      // First ensure user record exists in the database
      console.log('Creating user record if needed...');
      await createUserRecord();
      
      // Then create the bill - convert camelCase to snake_case
      const billData = {
        vendor: formData.vendor,
        amount: formData.amount,
        due_date: formData.dueDate,     // Convert to snake_case
        bill_date: formData.billDate,   // Convert to snake_case
        category: formData.category,
        is_recurring: formData.isRecurring,           // Convert to snake_case
        recurring_frequency: formData.recurringFrequency,   // Convert to snake_case
        recurring_end_date: formData.recurringEndDate,      // Convert to snake_case
        items: formData.items,
        notes: formData.notes,
        image_path: formData.imagePath,
        supabase_image_path: formData.supabasePath
      };
      
      console.log('Submitting bill data with converted field names:', billData);
      await createBill(billData);
      
      // Redirect to home page after successful save
      navigate('/');
    } catch (error) {
      console.error('Error saving bill:', error.response?.data || error);
      setExtractionError(error.response?.data?.error || error.message || 'Failed to save bill. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Render the component with sub-components
  return (
    <Container>
      <Title>Add New Bill</Title>
      
      <ImageUploadComponent
        showCamera={showCamera}
        imagePreview={imagePreview}
        extracting={extracting}
        extractionError={extractionError}
        webcamRef={webcamRef}
        handleFileChange={handleFileChange}
        handleCameraToggle={handleCameraToggle}
        handleCapture={handleCapture}
        handleRemoveImage={handleRemoveImage}
      />
      
      <BillDetailsForm
        formData={formData}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        saving={saving}
        navigate={navigate}
      />
    </Container>
  );
};

export default AddBill;
