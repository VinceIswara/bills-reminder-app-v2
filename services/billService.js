// services/billService.js
const supabase = require('../config/database');

/**
 * Get all bills
 * @returns {Promise<Array>} Array of bills
 * @deprecated Use getBillsByUserId instead
 */
const getAllBills = async () => {
  try {
    console.log('Fetching bills from Supabase...');
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data.length} bills`);
    return data;
  } catch (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
};

/**
 * Get all bills for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of bills for the user
 */
const getBillsByUserId = async (userId) => {
  try {
    console.log(`Fetching bills for user ${userId} from Supabase...`);
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data.length} bills for user ${userId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching bills for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get bill by ID
 * @param {string} id - Bill ID
 * @param {string} [userId] - Optional User ID to check ownership
 * @returns {Promise<Object>} Bill object
 */
const getBillById = async (id, userId = null) => {
  try {
    console.log(`Fetching bill with ID ${id} from Supabase...`);
    
    let query = supabase
      .from('bills')
      .select('*')
      .eq('id', id);
    
    // If userId is provided, add it to the query to check ownership
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      // If the error is because no rows were returned and userId was provided,
      // this could be because the bill exists but belongs to another user
      if (error.code === 'PGRST116' && userId) {
        // Check if the bill exists at all
        const { data: billExists } = await supabase
          .from('bills')
          .select('id')
          .eq('id', id)
          .single();
        
        if (billExists) {
          console.log(`Bill with ID ${id} exists but does not belong to user ${userId}`);
          return { id, user_id: 'unauthorized' }; // Return minimal info to indicate it exists but is unauthorized
        }
      }
      
      throw error;
    }
    
    if (!data) {
      console.log(`Bill with ID ${id} not found`);
      throw new Error('Bill not found');
    }
    
    console.log(`Retrieved bill with ID ${id}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching bill with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new bill
 * @param {Object} billData - Bill data
 * @returns {Promise<Object>} Created bill
 */
const createBill = async (billData) => {
  try {
    console.log('Creating new bill:', billData);
    
    // Handle both naming conventions for image paths
    const imagePath = billData.image_path || billData.imagePath || '';
    const supabasePath = billData.supabase_image_path || billData.supabasePath || '';
    
    console.log('Image paths:', { 
      imagePath, 
      supabasePath,
      originalImagePath: billData.image_path || billData.imagePath,
      originalSupabasePath: billData.supabase_image_path || billData.supabasePath
    });
    
    const formattedBillData = { 
      vendor: billData.vendor, 
      amount: parseFloat(billData.amount), 
      due_date: billData.dueDate, 
      bill_date: billData.billDate, 
      items: billData.items, 
      image_path: imagePath, 
      supabase_image_path: supabasePath,
      notes: billData.notes,
      category: billData.category || 'Uncategorized',
      is_recurring: billData.isRecurring || false,
      recurring_frequency: billData.recurringFrequency || null,
      recurring_end_date: billData.recurringEndDate || null,
      user_id: billData.user_id, // Include user_id from the request
      paid: false,
      created_at: new Date()
    };
    
    const { data, error } = await supabase
      .from('bills')
      .insert([formattedBillData])
      .select();
    
    if (error) throw error;
    
    console.log('Bill created successfully:', data);
    return data[0];
  } catch (error) {
    console.error('Error creating bill:', error);
    throw error;
  }
};

/**
 * Update a bill
 * @param {string} id - Bill ID
 * @param {Object} billData - Bill data
 * @returns {Promise<Object>} Updated bill
 */
const updateBill = async (id, billData) => {
  try {
    console.log(`Updating bill with ID ${id}:`, billData);
    
    const formattedBillData = { 
      vendor: billData.vendor, 
      amount: parseFloat(billData.amount), 
      due_date: billData.dueDate, 
      bill_date: billData.billDate, 
      items: billData.items, 
      notes: billData.notes,
      category: billData.category,
      is_recurring: billData.isRecurring || false,
      recurring_frequency: billData.recurringFrequency || null,
      recurring_end_date: billData.recurringEndDate || null,
      user_id: billData.user_id, // Preserve user_id
      paid: billData.paid,
      updated_at: new Date()
    };
    
    const { data, error } = await supabase
      .from('bills')
      .update(formattedBillData)
      .eq('id', id)
      .eq('user_id', billData.user_id) // Only update if the bill belongs to this user
      .select();
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      throw new Error('Bill not found or not owned by user');
    }
    
    console.log(`Bill with ID ${id} updated successfully:`, data);
    return data[0];
  } catch (error) {
    console.error(`Error updating bill with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a bill
 * @param {string} id - Bill ID
 * @param {string} [userId] - Optional User ID to check ownership
 * @returns {Promise<boolean>} Success status
 */
const deleteBill = async (id, userId = null) => {
  try {
    console.log(`Deleting bill with ID ${id}`);
    
    let query = supabase
      .from('bills')
      .delete();
    
    // Add user_id check if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    // Add the id check
    query = query.eq('id', id);
    
    const { error } = await query;
    
    if (error) throw error;
    
    console.log(`Bill with ID ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting bill with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get unpaid bills
 * @returns {Promise<Array>} Array of unpaid bills
 * @deprecated Use getUnpaidBillsForUser instead
 */
const getUnpaidBills = async () => {
  try {
    console.log('Fetching unpaid bills from Supabase...');
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('paid', false)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data.length} unpaid bills`);
    return data;
  } catch (error) {
    console.error('Error fetching unpaid bills:', error);
    throw error;
  }
};

/**
 * Get unpaid bills for a user (for notification purposes)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of unpaid bills
 */
const getUnpaidBillsForUser = async (userId) => {
  try {
    console.log(`Fetching unpaid bills for user ${userId}...`);
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('paid', false)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data.length} unpaid bills for user ${userId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching unpaid bills for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Mark bill as paid
 * @param {string} id - Bill ID
 * @param {string} [userId] - Optional User ID to check ownership
 * @returns {Promise<Object>} Updated bill
 */
const markBillAsPaid = async (id, userId = null) => {
  try {
    console.log(`Marking bill with ID ${id} as paid`);
    
    let query = supabase
      .from('bills')
      .update({ paid: true, updated_at: new Date() })
      .eq('id', id);
    
    // Add user_id check if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.select();
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      throw new Error('Bill not found or not owned by user');
    }
    
    console.log(`Bill with ID ${id} marked as paid:`, data);
    return data[0];
  } catch (error) {
    console.error(`Error marking bill with ID ${id} as paid:`, error);
    throw error;
  }
};

module.exports = {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getUnpaidBills,
  getUnpaidBillsForUser,
  markBillAsPaid,
  getBillsByUserId // Export the new function
};