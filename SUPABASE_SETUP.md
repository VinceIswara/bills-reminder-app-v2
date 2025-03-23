# Supabase Setup Guide

This guide will help you set up your Supabase project for the Bill Reminder app, including both bill management and notification features.

## 1. Create a Supabase Project

If you haven't already, create a new project in Supabase:

1. Go to [https://supabase.com](https://supabase.com) and sign in to your account
2. Click on "New Project"
3. Enter a name for your project
4. Set a secure database password
5. Choose a region closest to your users
6. Click "Create new project"

## 2. Create the Bills Table

You can create the `bills` table in two ways:

### Option 1: Using the SQL Editor

1. In your Supabase dashboard, go to the "SQL Editor" section
2. Create a new query
3. Copy and paste the SQL from the `supabase-schema.sql` file in this project
4. Run the query

### Option 2: Using the Table Editor

1. In your Supabase dashboard, go to the "Table Editor" section
2. Click "Create a new table"
3. Name the table `bills`
4. Add the following columns:
   - `id`: UUID (Primary Key, Default: `uuid_generate_v4()`)
   - `user_id`: UUID (Required, Foreign Key to Supabase auth.users)
   - `vendor`: Text (Required)
   - `amount`: Decimal (Required)
   - `due_date`: Date (Required)
   - `bill_date`: Date
   - `category`: Text
   - `items`: Text
   - `image_path`: Text
   - `supabase_image_path`: Text
   - `notes`: Text
   - `paid`: Boolean (Default: false)
   - `is_recurring`: Boolean (Default: false)
   - `recurring_frequency`: Text
   - `recurring_interval`: Text (Legacy field)
   - `recurring_end_date`: Date
   - `created_at`: Timestamp with timezone (Default: `now()`)
   - `updated_at`: Timestamp with timezone (Default: `now()`)
5. Click "Save"

## 3. Get Your API Keys

1. In your Supabase dashboard, go to the "Settings" section
2. Click on "API"
3. You'll find your project URL and anon/public key
4. Copy these values to your `.env` file:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_KEY=your_anon_key
   ```

## 4. Set Up Storage for Bill Images (Optional)

If you want to store bill images in Supabase Storage instead of locally:

1. In your Supabase dashboard, go to the "Storage" section
2. Click "Create a new bucket"
3. Name the bucket `bill-images`
4. Set the access level to "Private"
5. Click "Create bucket"
6. Update the bucket policy to allow authenticated users to upload and view images

## 5. Create Notification Tables

To support the notification system, you need to create additional tables:

### Option 1: Using the SQL Editor

1. In your Supabase dashboard, go to the "SQL Editor" section
2. Create a new query
3. Copy and paste the SQL from the `notification_tables.sql` file in this project
4. Run the query

### Option 2: Using the Table Editor

#### Create the Notifications Table

1. In your Supabase dashboard, go to the "Table Editor" section
2. Click "Create a new table"
3. Name the table `notifications`
4. Add the following columns:
   - `id`: UUID (Primary Key, Default: `uuid_generate_v4()`)
   - `user_id`: UUID (Required)
   - `title`: Text (Required)
   - `message`: Text (Required)
   - `bill_id`: UUID (Optional, Foreign Key to bills.id)
   - `type`: Text (Required) - Can be 'upcoming', 'due_today', 'overdue', or 'test'
   - `read`: Boolean (Default: false)
   - `created_at`: Timestamp with timezone (Default: `now()`)
   - `updated_at`: Timestamp with timezone (Default: `now()`)
5. Click "Save"

#### Create the Notification Preferences Table

1. Click "Create a new table" again
2. Name the table `notification_preferences`
3. Add the following columns:
   - `id`: UUID (Primary Key, Default: `uuid_generate_v4()`)
   - `user_id`: UUID (Required, Unique)
   - `email_notifications`: Boolean (Default: true)
   - `in_app_notifications`: Boolean (Default: true)
   - `notification_days_before`: Integer (Default: 3)
   - `notify_on_due_date`: Boolean (Default: true)
   - `notify_when_overdue`: Boolean (Default: true)
   - `email_address`: Text (Optional)
   - `created_at`: Timestamp with timezone (Default: `now()`)
   - `updated_at`: Timestamp with timezone (Default: `now()`)
4. Click "Save"

## 6. Set Up Row Level Security (RLS)

To ensure data security, set up Row Level Security policies for your tables:

1. In your Supabase dashboard, go to the "Authentication" section
2. Click on "Policies"
3. Select each table and create appropriate policies:

### For Bills Table

- Create a policy that allows users to select, insert, update, and delete only their own bills

```sql
CREATE POLICY "Users can view their own bills" ON public.bills
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills" ON public.bills
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills" ON public.bills
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills" ON public.bills
FOR DELETE USING (auth.uid() = user_id);
```

### For Notifications Table

- Create a policy that allows users to select, update, and delete only their own notifications

```sql
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);
```

### For Notification Preferences Table

- Create a policy that allows users to select, insert, update, and delete only their own notification preferences

```sql
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" ON public.notification_preferences
FOR DELETE USING (auth.uid() = user_id);
```

## 7. Create Indexes for Better Performance

To improve query performance, create the following indexes:

```sql
-- For bills table
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_paid ON public.bills(paid);

-- For notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- For notification_preferences table
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
```

## 8. Configure Email for Notifications

The Bill Reminder app supports multiple email providers for sending notifications:

1. Add the appropriate email configuration to your `.env` file based on your preferred provider:

### SMTP Configuration (Gmail, Outlook, etc.)

```
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_username
EMAIL_PASS=your_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

### SendGrid Configuration

```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

### Mailgun Configuration

```
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

### Amazon SES Configuration

```
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

2. Install any required dependencies for your chosen email provider:

```bash
# For Mailgun
npm install nodemailer-mailgun-transport

# For Amazon SES
npm install @aws-sdk/client-ses @aws-sdk/credential-provider-node
```

## 9. Test Your Connection

Once you've set up your Supabase project, notification tables, and added all credentials to your `.env` file, you can start the application and test the connection.

You can use the following endpoints to verify your setup:

- `/api/utilities/health`: Check the health of your API and connections
- `/api/notifications/test-email`: Test email delivery
- `/api/notifications/check-tables`: Verify that notification tables exist
