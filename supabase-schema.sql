-- Create the bills table
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  bill_date DATE,
  items TEXT,
  image_path TEXT,
  notes TEXT,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create an index on the due_date for faster queries
CREATE INDEX idx_bills_due_date ON bills(due_date);

-- Create an index on the paid status for faster queries
CREATE INDEX idx_bills_paid ON bills(paid);
