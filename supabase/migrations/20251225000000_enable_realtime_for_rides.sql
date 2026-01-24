/*
  # Enable Realtime for Rides Table
  
  This enables Supabase Realtime for the rides table so that
  rider pages can receive instant updates when drivers accept rides.
*/

-- Enable realtime for rides table
ALTER PUBLICATION supabase_realtime ADD TABLE rides;

-- Verify it's enabled (this will show in Supabase dashboard)
-- Check: Database → Replication → rides table should show as "Enabled"


