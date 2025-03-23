import styled from 'styled-components';

export const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 40px auto;
`;

export const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
`;

export const Subtitle = styled.p`
  color: #7f8c8d;
  margin-bottom: 30px;
  text-align: center;
  line-height: 1.5;
`;

export const ErrorMessage = styled.div`
  color: #e74c3c;
  margin-top: 20px;
  padding: 10px;
  background-color: #fadbd8;
  border-radius: 4px;
  width: 100%;
  max-width: 300px;
  text-align: center;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

export const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const LoadingText = styled.p`
  margin-top: 20px;
  font-size: 18px;
  color: #333;
`;

export const FooterText = styled.p`
  font-size: 12px;
  color: #666;
  margin-top: 10px;
  text-align: center;
`;