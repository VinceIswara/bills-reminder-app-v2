import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { getBillById, deleteBill } from '../utils/api';

// Image cache for preloaded images
const imageCache = new Map();

const DetailsContainer = styled.div`
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

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
`;

const Amount = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #e74c3c;
`;

// Create separate styled components for each status to avoid DOM warnings
const StatusBadge = styled.span`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-left: 10px;
  color: white;
`;

const PaidStatusBadge = styled(StatusBadge)`
  background-color: #27ae60;
`;

const PastDueStatusBadge = styled(StatusBadge)`
  background-color: #e74c3c;
`;

const UpcomingStatusBadge = styled(StatusBadge)`
  background-color: #f39c12;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  background-color: #f0f0f0;
  color: #555;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-left: 10px;
  vertical-align: middle;
`;

const DetailRow = styled.div`
  display: flex;
  margin-bottom: 15px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const DetailLabel = styled.div`
  font-weight: 500;
  color: #7f8c8d;
  width: 150px;
  flex-shrink: 0;
`;

const DetailValue = styled.div`
  color: #2c3e50;
`;

// Helper function to extract the filename from any path
const extractFilename = (path) => {
  if (!path) return null;
  
  const parts = path.split('/');
  return parts[parts.length - 1];
};

/**
 * Debug function to log all image-related data
 */
const logBillImageInfo = (bill) => {
  console.log("=== Bill Image Debug Info ===");
  console.log("bill.id:", bill.id);
  console.log("bill.image_path:", bill.image_path);
  console.log("bill.supabase_image_path:", bill.supabase_image_path);
  console.log("Extracted filename:", extractFilename(bill.image_path));
  console.log("=============================");
};

// Create a completely standalone image component
const BillImage = ({ bill }) => {
  const [status, setStatus] = useState('loading');
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const imgRef = useRef(null);
  
  useEffect(() => {
    if (!bill) return;
    
    // Log bill data for debugging
    logBillImageInfo(bill);
    
    // Reset loading state
    setStatus('loading');
    setFallbackAttempted(false);
    
    // Extract filename regardless of the path structure
    const filename = extractFilename(bill.image_path);
    
    // If no filename could be extracted
    if (!filename) {
      console.error("Could not extract filename from image path:", bill.image_path);
      setStatus('error');
      return;
    }
    
    // First try direct /uploads/ path
    const imageUrl = `http://localhost:5002/uploads/${filename}`;
    
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
        const fallbackUrl = `http://localhost:5002/api/uploads/${filename}`;
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
  }, [bill, fallbackAttempted]);
  
  if (!bill || (!bill.image_path && !bill.supabase_image_path)) {
    return <div className="placeholder">No image available</div>;
  }
  
  if (status === 'error') {
    return <div className="placeholder">Failed to load image</div>;
  }
  
  return (
    <>
      {status === 'loading' && (
        <div className="loading-overlay">Loading image...</div>
      )}
      <img
        ref={imgRef}
        alt={`Bill from ${bill.vendor}`}
        // Use a valid 1x1 transparent GIF as the initial src
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        style={{ 
          maxWidth: '100%', 
          borderRadius: '8px',
          opacity: status === 'loading' ? 0.5 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
    </>
  );
};

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 30px;
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

const EditButton = styled(Link)`
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const DeleteButton = styled(Button)`
  background-color: #e74c3c;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #c0392b;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const ModalTitle = styled.h2`
  color: #2c3e50;
  margin-top: 0;
`;

const ModalText = styled.p`
  color: #7f8c8d;
  margin-bottom: 20px;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const CancelButton = styled(Button)`
  background-color: #95a5a6;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #7f8c8d;
  }
`;

const ConfirmButton = styled(Button)`
  background-color: #e74c3c;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #c0392b;
  }
`;

const BillDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  useEffect(() => {
    fetchBillDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  useEffect(() => {
    if (bill) {
      // Get the primary image URL for this bill
      const imageUrl = extractFilename(bill.image_path);
      
      // If it's not a placeholder and not already cached
      if (imageUrl && !imageUrl.includes('placeholder') && !imageCache.has(imageUrl)) {
        // Preload the image
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => imageCache.set(imageUrl, true);
        
        // Also preload the fallback URL
        const filename = imageUrl.split('/').pop();
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
        const fallbackUrl = `${apiUrl}/api/uploads/${filename}`;
        
        if (!imageCache.has(fallbackUrl)) {
          const fallbackImg = new Image();
          fallbackImg.src = fallbackUrl;
          fallbackImg.onload = () => imageCache.set(fallbackUrl, true);
        }
      }
    }
  }, [bill]);
  
  const fetchBillDetails = async (forceRefresh = false) => {
    try {
      // Check if we've fetched recently and already have bill data
      const now = Date.now();
      if (!forceRefresh && bill && now - lastFetchTime < 30000) {
        console.log('Using recently fetched bill data');
        return;
      }
      
      setLoading(true);
      const response = await getBillById(id, forceRefresh);
      console.log('Bill details response:', response);
      
      // Handle response format
      if (response) {
        let billData;
        if (response.success && response.data) {
          billData = response.data;
        } else if (response.id) {
          billData = response;
        } else {
          setError('Invalid response format from server');
          console.error('Invalid response format:', response);
          return;
        }
        
        // Keep the original image_path for debugging
        console.log('Original image_path:', billData.image_path);
        
        setBill(billData);
        setLastFetchTime(now);  // Update the lastFetchTime
      } else {
        setError('No data received from server');
        console.error('No response data:', response);
      }
    } catch (err) {
      setError('Failed to fetch bill details. Please try again later.');
      console.error('Error fetching bill details:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteBill(id);
      navigate('/');
    } catch (err) {
      console.error('Error deleting bill:', err);
      alert('Failed to delete bill. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };
  
  const isPastDue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  if (loading) {
    return <DetailsContainer><p>Loading bill details...</p></DetailsContainer>;
  }
  
  if (error || !bill) {
    return (
      <DetailsContainer>
        <BackLink to="/"><span>←</span> Back to Bills</BackLink>
        <p>{error || 'Bill not found'}</p>
      </DetailsContainer>
    );
  }
  
  return (
    <DetailsContainer>
      <BackLink to="/"><span>←</span> Back to Bills</BackLink>
      
      <Card>
        <Header>
          <div>
            <Title>
              {bill.vendor}
              {bill.paid ? (
                <PaidStatusBadge>Paid</PaidStatusBadge>
              ) : isPastDue(bill.due_date) ? (
                <PastDueStatusBadge>Past Due</PastDueStatusBadge>
              ) : (
                <UpcomingStatusBadge>Upcoming</UpcomingStatusBadge>
              )}
              <CategoryBadge>{bill.category || 'Uncategorized'}</CategoryBadge>
            </Title>
          </div>
          <Amount>{formatCurrency(bill.amount)}</Amount>
        </Header>
        
        <DetailRow>
          <DetailLabel>Bill Date:</DetailLabel>
          <DetailValue>{bill.bill_date ? formatDate(bill.bill_date) : 'Not specified'}</DetailValue>
        </DetailRow>
        
        <DetailRow>
          <DetailLabel>Due Date:</DetailLabel>
          <DetailValue>{formatDate(bill.due_date)}</DetailValue>
        </DetailRow>
        
        <DetailRow>
          <DetailLabel>Category:</DetailLabel>
          <DetailValue>{bill.category || 'Uncategorized'}</DetailValue>
        </DetailRow>
        
        {bill.is_recurring && (
          <>
            <DetailRow>
              <DetailLabel>Recurring:</DetailLabel>
              <DetailValue>Yes</DetailValue>
            </DetailRow>
            
            <DetailRow>
              <DetailLabel>Frequency:</DetailLabel>
              <DetailValue>
                {bill.recurring_frequency ? bill.recurring_frequency.charAt(0).toUpperCase() + bill.recurring_frequency.slice(1) : 'Monthly'}
              </DetailValue>
            </DetailRow>
            
            {bill.recurring_end_date && (
              <DetailRow>
                <DetailLabel>End Date:</DetailLabel>
                <DetailValue>{formatDate(bill.recurring_end_date)}</DetailValue>
              </DetailRow>
            )}
          </>
        )}
        
        {bill.items && (
          <DetailRow>
            <DetailLabel>Items:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-line' }}>{bill.items}</DetailValue>
          </DetailRow>
        )}
        
        {bill.notes && (
          <DetailRow>
            <DetailLabel>Notes:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-line' }}>{bill.notes}</DetailValue>
          </DetailRow>
        )}
        
        {bill.image_path || bill.supabase_image_path ? (
          <div className="bill-image-container">
            <DetailRow>
              <DetailLabel>Bill Image:</DetailLabel>
            </DetailRow>
            <BillImage bill={bill} />
          </div>
        ) : (
          <div className="no-image-placeholder">
            <p>No image available</p>
          </div>
        )}
        
        <ButtonGroup>
          <EditButton to={`/edit/${bill.id}`}>Edit Bill</EditButton>
          <DeleteButton onClick={() => setShowDeleteModal(true)}>Delete Bill</DeleteButton>
        </ButtonGroup>
      </Card>
      
      {showDeleteModal && (
        <Modal>
          <ModalContent>
            <ModalTitle>Delete Bill</ModalTitle>
            <ModalText>Are you sure you want to delete this bill? This action cannot be undone.</ModalText>
            <ModalButtons>
              <CancelButton 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </CancelButton>
              <ConfirmButton 
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </ConfirmButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </DetailsContainer>
  );
};

export default BillDetails;
