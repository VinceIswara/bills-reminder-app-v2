import styled from 'styled-components';
import { Link } from 'react-router-dom';

// Container and layout components
export const NotificationsContainer = styled.div`
  padding: 20px;
`;

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
`;

export const NotificationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

// Empty state components
export const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const EmptyStateText = styled.p`
  color: #7f8c8d;
  font-size: 1.1rem;
  margin-bottom: 20px;
`;

// Notification card components
export const NotificationCard = styled.div`
  background-color: ${props => props.read === "true" ? 'white' : '#f8f9fa'};
  border-left: 4px solid ${props => {
    switch(props.type) {
      case 'upcoming':
        return '#f39c12';
      case 'due_today':
        return '#3498db';
      case 'overdue':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  }};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 15px;
  position: relative;
`;

export const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
`;

export const NotificationTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
  ${props => props.read === "true" ? '' : 'font-weight: 600;'}
`;

export const NotificationDate = styled.span`
  color: #7f8c8d;
  font-size: 0.9rem;
`;

export const NotificationMessage = styled.p`
  color: #34495e;
  margin: 0 0 15px 0;
  line-height: 1.5;
`;

export const NotificationActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

// Button components
export const ActionButton = styled.button`
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 5px;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const DeleteButton = styled(ActionButton)`
  color: #e74c3c;
`;

export const ViewBillButton = styled(Link)`
  background-color: #3498db;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  
  &:hover {
    background-color: #2980b9;
  }
`;

export const RefreshButton = styled.button`
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &:hover {
    background-color: #e9ecef;
  }
`;

export const SettingsLink = styled(Link)`
  background-color: #3498db;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    background-color: #2980b9;
  }
`; 