import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getAllBills, updateBill } from '../utils/api';

const HomeContainer = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
`;

const AddButton = styled(Link)`
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const BillsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BillCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const BillHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const VendorName = styled.h2`
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0;
`;

const Amount = styled.span`
  font-size: 1.25rem;
  font-weight: bold;
  color: #e74c3c;
`;

const DueDateBase = styled.p`
  color: #7f8c8d;
  font-weight: normal;
  margin-bottom: 5px;
`;

const PastDueDate = styled(DueDateBase)`
  color: #e74c3c;
  font-weight: bold;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  background-color: #f0f0f0;
  color: #555;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 10px;
`;

const BillActions = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
`;

const ViewButton = styled(Link)`
  background-color: #3498db;
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.9rem;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const ButtonBase = styled.button`
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
`;

const MarkAsPaidButton = styled(ButtonBase)`
  background-color: #95a5a6;
  
  &:hover {
    background-color: #7f8c8d;
  }
`;

const PaidButton = styled(ButtonBase)`
  background-color: #27ae60;
  
  &:hover {
    background-color: #219653;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const EmptyStateText = styled.p`
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-bottom: 20px;
`;

const FiltersContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
`;

const FiltersTitle = styled.h3`
  font-size: 1.2rem;
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 15px;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FilterLabel = styled.label`
  font-weight: 500;
  margin-bottom: 5px;
  color: #2c3e50;
`;

const FilterSelect = styled.select`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ClearFiltersButton = styled.button`
  background-color: #95a5a6;
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 15px;
  align-self: flex-start;
  
  &:hover {
    background-color: #7f8c8d;
  }
`;

/**
 * Home component - Main dashboard for displaying and managing bills
 */
const Home = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    recurring: 'all',
    dueDate: 'all'
  });
  
  // Add state to track when we last fetched data
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Use ref to keep track of if component is mounted
  const isMounted = useRef(true);

  /**
   * Check if a due date is in the past
   */
  const isPastDue = useCallback((dueDate) => {
    return new Date(dueDate) < new Date();
  }, []);

  /**
   * Apply filters to the bills array
   * @param {Array} billsToFilter - The bills to filter
   * @param {Object} filterSettings - The current filter settings
   * @returns {Array} Filtered bills
   */
  const applyFilters = useCallback((billsToFilter, filterSettings) => {
    if (!billsToFilter || !billsToFilter.length) return [];
    
    let result = [...billsToFilter];
    
    // Filter by category
    if (filterSettings.category !== 'all') {
      result = result.filter(bill => bill.category === filterSettings.category);
    }
    
    // Filter by payment status
    if (filterSettings.status === 'paid') {
      result = result.filter(bill => bill.paid);
    } else if (filterSettings.status === 'unpaid') {
      result = result.filter(bill => !bill.paid);
    } else if (filterSettings.status === 'overdue') {
      result = result.filter(bill => !bill.paid && isPastDue(bill.due_date));
    }
    
    // Filter by recurring status
    if (filterSettings.recurring === 'recurring') {
      result = result.filter(bill => bill.is_recurring);
    } else if (filterSettings.recurring === 'non-recurring') {
      result = result.filter(bill => !bill.is_recurring);
    }
    
    // Filter by due date
    if (filterSettings.dueDate !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      if (filterSettings.dueDate === 'today') {
        result = result.filter(bill => {
          const dueDate = new Date(bill.due_date);
          return dueDate.toDateString() === today.toDateString();
        });
      } else if (filterSettings.dueDate === 'tomorrow') {
        result = result.filter(bill => {
          const dueDate = new Date(bill.due_date);
          return dueDate.toDateString() === tomorrow.toDateString();
        });
      } else if (filterSettings.dueDate === 'this-week') {
        result = result.filter(bill => {
          const dueDate = new Date(bill.due_date);
          return dueDate >= today && dueDate <= nextWeek;
        });
      } else if (filterSettings.dueDate === 'this-month') {
        result = result.filter(bill => {
          const dueDate = new Date(bill.due_date);
          return dueDate >= today && dueDate <= nextMonth;
        });
      } else if (filterSettings.dueDate === 'overdue') {
        result = result.filter(bill => {
          return !bill.paid && isPastDue(bill.due_date);
        });
      }
    }
    
    return result;
  }, [isPastDue]);

  // Apply filters whenever bills or filters change
  const filteredBills = useMemo(() => {
    return applyFilters(bills, filters);
  }, [bills, filters, applyFilters]);

  /**
   * Fetch all bills from the API with caching
   */
  const fetchBills = useCallback(async (forceRefresh = false) => {
    // Skip fetching if:
    // 1. We already have bills
    // 2. It's been less than 30 seconds since last fetch
    // 3. We're not forcing a refresh
    const now = Date.now();
    if (!forceRefresh && bills.length > 0 && now - lastFetchTime < 30000) {
      console.log('Using recent bills data (cached locally)');
      return;
    }
    
    try {
      if (isMounted.current) setLoading(true);
      
      console.log('Fetching bills from API...');
      const data = await getAllBills(forceRefresh);
      
      if (isMounted.current) {
        setBills(data);
        setLastFetchTime(now);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      if (isMounted.current) {
        setError('Failed to fetch bills. Please try again later.');
        setLoading(false);
      }
    }
  }, [bills.length, lastFetchTime]);
  
  // Fetch bills when component mounts
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Fetch bills on mount
    fetchBills();
    
    // Cleanup function to prevent updates after unmount
    return () => {
      isMounted.current = false;
    };
  }, [fetchBills]);
  
  /**
   * Handle filter selection change
   */
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  /**
   * Reset all filters to default values
   */
  const clearFilters = useCallback(() => {
    setFilters({
      category: 'all',
      status: 'all',
      recurring: 'all',
      dueDate: 'all'
    });
  }, []);

  /**
   * Toggle the paid status of a bill
   */
  const togglePaidStatus = useCallback(async (id, currentStatus) => {
    try {
      const billToUpdate = bills.find(bill => bill.id === id);
      if (!billToUpdate) return;
      
      // Optimistically update the UI
      const updatedBills = bills.map(bill => 
        bill.id === id ? { ...bill, paid: !currentStatus } : bill
      );
      
      setBills(updatedBills);
      
      // Send update to server
      await updateBill(id, { ...billToUpdate, paid: !currentStatus });
      
      // Update the full data after the change is confirmed
      // Use a delay to avoid immediate refetch
      setTimeout(() => {
        fetchBills(true);
      }, 1000);
    } catch (err) {
      console.error('Error updating bill status:', err);
      // Revert optimistic update on error
      fetchBills(true);
    }
  }, [bills, fetchBills]);

  /**
   * Format a date string for display
   */
  const formatDate = useCallback((dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }, []);

  /**
   * Format a number as currency
   */
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }, []);

  if (loading && bills.length === 0) {
    return <HomeContainer><p>Loading bills...</p></HomeContainer>;
  }

  if (error && bills.length === 0) {
    return <HomeContainer><p>{error}</p></HomeContainer>;
  }

  return (
    <HomeContainer>
      <Header>
        <Title>Your Bills</Title>
        <AddButton to="/add">Add New Bill</AddButton>
      </Header>
      
      <FiltersContainer>
        <FiltersTitle>Filter Bills</FiltersTitle>
        <FiltersGrid>
          <FilterGroup>
            <FilterLabel htmlFor="category">Category</FilterLabel>
            <FilterSelect 
              id="category" 
              name="category" 
              value={filters.category} 
              onChange={handleFilterChange}
            >
              <option value="all">All Categories</option>
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
            </FilterSelect>
          </FilterGroup>
          
          <FilterGroup>
            <FilterLabel htmlFor="status">Status</FilterLabel>
            <FilterSelect 
              id="status" 
              name="status" 
              value={filters.status} 
              onChange={handleFilterChange}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </FilterSelect>
          </FilterGroup>
          
          <FilterGroup>
            <FilterLabel htmlFor="recurring">Recurring</FilterLabel>
            <FilterSelect 
              id="recurring" 
              name="recurring" 
              value={filters.recurring} 
              onChange={handleFilterChange}
            >
              <option value="all">All Bills</option>
              <option value="recurring">Recurring Only</option>
              <option value="non-recurring">Non-Recurring Only</option>
            </FilterSelect>
          </FilterGroup>
          
          <FilterGroup>
            <FilterLabel htmlFor="dueDate">Due Date</FilterLabel>
            <FilterSelect 
              id="dueDate" 
              name="dueDate" 
              value={filters.dueDate} 
              onChange={handleFilterChange}
            >
              <option value="all">All Due Dates</option>
              <option value="today">Due Today</option>
              <option value="tomorrow">Due Tomorrow</option>
              <option value="this-week">Due This Week</option>
              <option value="this-month">Due This Month</option>
              <option value="overdue">Overdue</option>
            </FilterSelect>
          </FilterGroup>
        </FiltersGrid>
        
        <ClearFiltersButton onClick={clearFilters}>
          Clear Filters
        </ClearFiltersButton>
      </FiltersContainer>

      {bills.length === 0 ? (
        <EmptyState>
          <EmptyStateText>You don't have any bills yet.</EmptyStateText>
          <AddButton to="/add">Add Your First Bill</AddButton>
        </EmptyState>
      ) : (
        <BillsContainer>
          {filteredBills.length === 0 ? (
            <EmptyState>
              <EmptyStateText>No bills match your current filters.</EmptyStateText>
              <ClearFiltersButton onClick={clearFilters}>
                Clear Filters
              </ClearFiltersButton>
            </EmptyState>
          ) : (
            filteredBills.map(bill => (
              <BillCard key={bill.id}>
                <BillHeader>
                  <VendorName>{bill.vendor}</VendorName>
                  <Amount>{formatCurrency(bill.amount)}</Amount>
                </BillHeader>
                {isPastDue(bill.due_date) && !bill.paid ? (
                  <PastDueDate>Due: {formatDate(bill.due_date)}</PastDueDate>
                ) : (
                  <DueDateBase>Due: {formatDate(bill.due_date)}</DueDateBase>
                )}
                <CategoryBadge>{bill.category || 'Uncategorized'}</CategoryBadge>
                <BillActions>
                  <ViewButton to={`/bill/${bill.id}`}>View Details</ViewButton>
                  {bill.paid ? (
                    <PaidButton onClick={() => togglePaidStatus(bill.id, bill.paid)}>
                      Paid
                    </PaidButton>
                  ) : (
                    <MarkAsPaidButton onClick={() => togglePaidStatus(bill.id, bill.paid)}>
                      Mark as Paid
                    </MarkAsPaidButton>
                  )}
                </BillActions>
              </BillCard>
            ))
          )}
        </BillsContainer>
      )}
    </HomeContainer>
  );
};

export default Home;
