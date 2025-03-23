import styled from 'styled-components';

// Container styles
export const Container = styled.div`
  padding: 20px;
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

// Form elements
export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Label = styled.label`
  font-weight: 500;
  margin-bottom: 5px;
  color: #2c3e50;
`;

export const Input = styled.input`
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

export const TextArea = styled.textarea`
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

// Checkbox styles
export const Checkbox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
`;

export const CheckboxInput = styled.input`
  width: 18px;
  height: 18px;
`;

export const CheckboxLabel = styled.label`
  font-weight: 500;
  color: #2c3e50;
`;

// Button styles
export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

export const Button = styled.button`
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

export const CancelButton = styled(Button)`
  background-color: #95a5a6;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #7f8c8d;
  }
`;

export const SaveButton = styled(Button)`
  background-color: #2ecc71;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #27ae60;
  }
`;

// Image upload styles
export const ImageUploadSection = styled.div`
  margin-bottom: 30px;
`;

export const UploadOptions = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const UploadButton = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 30px;
  cursor: pointer;
  flex: 1;
  transition: all 0.2s;
  
  &:hover {
    background-color: #eee;
    border-color: #95a5a6;
  }
`;

export const CameraButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 30px;
  cursor: pointer;
  flex: 1;
  transition: all 0.2s;
  
  &:hover {
    background-color: #eee;
    border-color: #95a5a6;
  }
`;

export const ButtonText = styled.span`
  margin-top: 10px;
  font-size: 1rem;
  color: #7f8c8d;
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const WebcamContainer = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const CaptureButton = styled.button`
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 1.5rem;
  margin-top: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: #c0392b;
  }
`;

export const CloseButton = styled.button`
  background-color: #7f8c8d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  margin-top: 10px;
  cursor: pointer;
  
  &:hover {
    background-color: #95a5a6;
  }
`;

export const ImagePreview = styled.div`
  margin-top: 20px;
  text-align: center;
`;

export const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 2s linear infinite;
  margin: 20px auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const ErrorMessage = styled.div`
  color: #e74c3c;
  background-color: #fadbd8;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
`; 