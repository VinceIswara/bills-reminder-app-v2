import React from 'react';
import {
  Card,
  Form,
  FormGroup,
  Label,
  Input,
  Select,
  TextArea,
  Checkbox,
  CheckboxInput,
  CheckboxLabel,
  ButtonGroup,
  CancelButton,
  SaveButton
} from '../styles/FormStyles';

/**
 * Bill details form component
 */
const BillDetailsForm = ({ formData, handleInputChange, handleSubmit, saving, navigate }) => (
  <Card>
    <h2>Bill Details</h2>
    <p>Review and edit the extracted information</p>
    
    <Form onSubmit={handleSubmit}>
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
      
      <ButtonGroup>
        <CancelButton 
          type="button" 
          onClick={() => navigate('/')}
          disabled={saving}
        >
          Cancel
        </CancelButton>
        <SaveButton 
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Bill'}
        </SaveButton>
      </ButtonGroup>
    </Form>
  </Card>
);

export default BillDetailsForm; 