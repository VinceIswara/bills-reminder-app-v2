import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { getBillById, updateBill } from '../utils/api';

const EditBillContainer = styled.div`
  padding: 20px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: #3498db;
  text-decoration: none;
  margin-bottom: 20px;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 500;
  margin-bottom: 5px;
  color: #2c3e50;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const TextArea = styled.textarea`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Checkbox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
`;

const CheckboxInput = styled.input`
  width: 18px;
  height: 18px;
`;

const CheckboxLabel = styled.label`
  font-weight: 500;
  color: #2c3e50;
`;

// Add a styled component for the loading overlay
const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  color: #3498db;
`;

// Add a styled component
const PlaceholderImage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 8px;
  padding: 30px;
  color: #6c757d;
  font-style: italic;
`;

/**
 * Creates appropriate image URL from different possible formats
 * @param {Object} bill - The bill object 
 * @returns {string} The correct image URL
 */
const getImageUrl = (bill) => {
  // If no bill or no image paths, return placeholder
  if (!bill || (!bill.imagePath && !bill.supabaseImagePath)) {
    return '/placeholder-bill.png';
  }
  
  // For local images, extract just the filename
  if (bill.imagePath) {
    // Extract just the filename, regardless of path format
    const filename = bill.imagePath.split('/').pop();
    // URL encode the filename to handle special characters
    const encodedFilename = encodeURIComponent(filename);
    
    // Base API URL
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
    
    // Construct a direct URL to the uploads directory
    return `${apiUrl}/uploads/${encodedFilename}`;
  }
  
  // If we get here and there's no valid path, use placeholder
  return '/placeholder-bill.png';
};

/**
 * Component to display bill image with fallback handling
 */
const BillImage = ({ bill, alt, ...props }) => {
  const [status, setStatus] = useState('loading');
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const imgRef = useRef(null);
  
  useEffect(() => {
    // Reset status when bill changes
    setStatus('loading');
    setFallbackAttempted(false);
    
    // Only proceed if we have image information
    if (bill && (bill.imagePath || bill.supabaseImagePath)) {
      // For local images, extract just the filename
      if (bill.imagePath) {
        // Extract just the filename, regardless of path format
        const filename = bill.imagePath.split('/').pop();
        // URL encode the filename to handle special characters
        const encodedFilename = encodeURIComponent(filename);
        
        // Base API URL
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
        
        // Construct a direct URL to the uploads directory
        const imageUrl = `${apiUrl}/uploads/${encodedFilename}`;
        
        console.log("Attempting to load image from:", imageUrl);
        
        // Create a new image element to test loading
        const img = new Image();
        
        img.onload = () => {
          console.log("Image loaded successfully from:", imageUrl);
          // Update the img tag src directly using ref
          if (imgRef.current) {
            imgRef.current.src = imageUrl;
          }
          setStatus('loaded');
        };
        
        img.onerror = () => {
          console.error("Failed to load from first URL:", imageUrl);
          
          if (!fallbackAttempted) {
            setFallbackAttempted(true);
            
            // Try fallback with /api/uploads/ path
            const fallbackUrl = `${apiUrl}/api/uploads/${encodedFilename}`;
            console.log("Trying fallback URL:", fallbackUrl);
            
            const fallbackImg = new Image();
            
            fallbackImg.onload = () => {
              console.log("Image loaded successfully from fallback:", fallbackUrl);
              // Update the img tag src directly using ref
              if (imgRef.current) {
                imgRef.current.src = fallbackUrl;
              }
              setStatus('loaded');
            };
            
            fallbackImg.onerror = () => {
              console.error("Failed to load from fallback URL:", fallbackUrl);
              setStatus('error');
            };
            
            fallbackImg.src = fallbackUrl;
          } else {
            setStatus('error');
          }
        };
        
        img.src = imageUrl;
      }
    } else {
      setStatus('error');
    }
  }, [bill, fallbackAttempted]);
  
  if (!bill || (!bill.imagePath && !bill.supabaseImagePath)) {
    return <PlaceholderImage>No image available</PlaceholderImage>;
  }
  
  if (status === 'error') {
    return <PlaceholderImage>Failed to load image</PlaceholderImage>;
  }
  
  return (
    <>
      {status === 'loading' && (
        <LoadingOverlay>Loading image...</LoadingOverlay>
      )}
      <img
        ref={imgRef}
        // Use a valid 1x1 transparent GIF as the initial src
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        alt={alt || `Bill image`}
        style={{ 
          maxWidth: '100%', 
          borderRadius: '8px',
          opacity: status === 'loading' ? 0.5 : 1,
          transition: 'opacity 0.3s ease'
        }}
        {...props}
      />
    </>
  );
};

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: #95a5a6;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #7f8c8d;
  }
`;

const SaveButton = styled(Button)`
  background-color: #2ecc71;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #27ae60;
  }
`;

const EditBill = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    dueDate: '',
    billDate: '',
    items: '',
    notes: '',
    paid: false,
    imagePath: '',
    supabaseImagePath: '',
    category: 'Uncategorized',
    isRecurring: false,
    recurringFrequency: 'monthly',
    recurringEndDate: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Format date string for input fields
  const formatDateForInput = useCallback((dateStr) => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  }, []);
  
  const fetchBillDetails = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      // Skip fetch if we already have data and it's recent
      if (!forceRefresh && 
          formData.vendor && // Check if we have meaningful data
          now - lastFetchTime < 30000) {
        console.log('Using recently fetched bill data in edit form');
        return;
      }
      
      setLoading(true);
      const response = await getBillById(id, forceRefresh);
      const bill = response.data || response; // Handle both response formats
      
      if (bill) {
        setFormData({
          vendor: bill.vendor || '',
          amount: bill.amount || '',
          dueDate: formatDateForInput(bill.due_date) || '',
          billDate: formatDateForInput(bill.bill_date) || '',
          items: bill.items || '',
          notes: bill.notes || '',
          paid: bill.paid || false,
          imagePath: bill.image_path || '',
          supabaseImagePath: bill.supabase_image_path || '',
          category: bill.category || 'Uncategorized',
          isRecurring: bill.is_recurring || false,
          recurringFrequency: bill.recurring_frequency || 'monthly',
          recurringEndDate: formatDateForInput(bill.recurring_end_date) || ''
        });
        setLastFetchTime(now); // Update the lastFetchTime
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch bill details. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, formatDateForInput, formData.vendor, lastFetchTime]);
  
  useEffect(() => {
    fetchBillDetails();
  }, [fetchBillDetails]);
  
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);
  
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      await updateBill(id, formData);
      
      // Redirect to bill details page after successful save
      navigate(`/bill/${id}`);
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('Failed to update bill. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [id, formData, navigate]);
  
  if (loading) {
    return <EditBillContainer><p>Loading bill details...</p></EditBillContainer>;
  }
  
  if (error) {
    return (
      <EditBillContainer>
        <BackLink to={`/bill/${id}`}><span>←</span> Back to Bill Details</BackLink>
        <p>{error}</p>
      </EditBillContainer>
    );
  }
  
  return (
    <EditBillContainer>
      <BackLink to={`/bill/${id}`}><span>←</span> Back to Bill Details</BackLink>
      
      <Title>Edit Bill</Title>
      
      <Card>
        <Form onSubmit={handleSubmit} style={{ opacity: saving ? 0.7 : 1 }}>
          <FormGroup>
            <Label htmlFor="vendor">Vendor/Company</Label>
            <Input
              type="text"
              id="vendor"
              name="vendor"
              value={formData.vendor}
              onChange={handleInputChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="billDate">Bill Date</Label>
            <Input
              type="date"
              id="billDate"
              name="billDate"
              value={formData.billDate}
              onChange={handleInputChange}
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="Uncategorized">Uncategorized</option>
              <option value="Utilities">Utilities</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Housing">Housing</option>
              <option value="Food">Food</option>
              <option value="Transportation">Transportation</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Insurance">Insurance</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="items">Bill Items</Label>
            <TextArea
              id="items"
              name="items"
              value={formData.items}
              onChange={handleInputChange}
              placeholder="List of items or services"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="notes">Notes</Label>
            <TextArea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this bill"
            />
          </FormGroup>
          
          <Checkbox>
            <CheckboxInput
              type="checkbox"
              id="paid"
              name="paid"
              checked={formData.paid}
              onChange={handleInputChange}
            />
            <CheckboxLabel htmlFor="paid">Mark as Paid</CheckboxLabel>
          </Checkbox>

          <FormGroup>
            <Checkbox>
              <CheckboxInput
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleInputChange}
              />
              <CheckboxLabel htmlFor="isRecurring">This is a recurring bill</CheckboxLabel>
            </Checkbox>
          </FormGroup>
          
          {formData.isRecurring && (
            <>
              <FormGroup>
                <Label htmlFor="recurringFrequency">Recurring Frequency</Label>
                <Select
                  id="recurringFrequency"
                  name="recurringFrequency"
                  value={formData.recurringFrequency}
                  onChange={handleInputChange}
                  required={formData.isRecurring}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semiannually">Semi-annually</option>
                  <option value="annually">Annually</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="recurringEndDate">End Date (Optional)</Label>
                <Input
                  type="date"
                  id="recurringEndDate"
                  name="recurringEndDate"
                  value={formData.recurringEndDate}
                  onChange={handleInputChange}
                  min={formData.dueDate}
                />
                <small>Leave blank if the bill recurs indefinitely</small>
              </FormGroup>
            </>
          )}
          
          {(formData.imagePath || formData.supabaseImagePath) && (
            <FormGroup>
              <Label>Bill Image</Label>
              <BillImage 
                bill={formData}
                alt={`Bill from ${formData.vendor}`}
              />
            </FormGroup>
          )}
          
          <ButtonGroup>
            <CancelButton 
              type="button" 
              onClick={() => navigate(`/bill/${id}`)}
              disabled={saving}
            >
              Cancel
            </CancelButton>
            <SaveButton 
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </SaveButton>
          </ButtonGroup>
        </Form>
      </Card>
    </EditBillContainer>
  );
};

export default EditBill;
