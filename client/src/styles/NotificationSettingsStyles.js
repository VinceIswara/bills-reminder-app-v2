import styled from 'styled-components';
import { Link } from 'react-router-dom';

// Layout components
export const SettingsContainer = styled.div`
  padding: 20px;
`;

export const BackLink = styled(Link)`
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

export const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 20px;
`;

export const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
`;

// Form components
export const FormGroup = styled.div`
  margin-bottom: 20px;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

export const Select = styled.select`
  width: 100%;
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

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

export const Checkbox = styled.input`
  margin-right: 10px;
`;

export const CheckboxLabel = styled.label`
  font-size: 1rem;
  color: #2c3e50;
`;

export const Description = styled.p`
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-top: 5px;
`;

// Button components
export const Button = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #2980b9;
  }
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled(Button)`
  background-color: #f1f1f1;
  color: #333;
  margin-right: 10px;
  
  &:hover {
    background-color: #e1e1e1;
  }
  
  &:disabled {
    background-color: #f1f1f1;
    color: #999;
    cursor: not-allowed;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

export const TestNotificationButton = styled(SecondaryButton)`
  background-color: #2ecc71;
  color: white;
  
  &:hover {
    background-color: #27ae60;
  }
`;

// Notification history components
export const NotificationHistoryTitle = styled.h2`
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 30px 0 15px 0;
`;

export const NotificationItem = styled.div`
  padding: 12px;
  background-color: ${props => props.read ? '#f8f9fa' : 'white'};
  border-left: 4px solid #3498db;
  border-radius: 4px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
`;

export const NotificationTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #2c3e50;
`;

export const NotificationDate = styled.span`
  color: #7f8c8d;
  font-size: 0.8rem;
`;

export const NotificationMessage = styled.p`
  margin: 0;
  color: #34495e;
  font-size: 0.9rem;
`;

// Loading and message components
export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 10px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const SuccessMessage = styled.div`
  background-color: #27ae60;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

export const ErrorMessage = styled.div`
  background-color: #e74c3c;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
`; 