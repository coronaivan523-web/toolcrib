-- Create quality_reports table for tracking material quality issues
-- This table handles reports from multiple stages: Incoming, Processing, and Post-Delivery

CREATE TABLE IF NOT EXISTS quality_reports (
    id BIGSERIAL PRIMARY KEY,
    
    -- Material information
    material_id BIGINT REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Report classification
    report_stage VARCHAR(50) NOT NULL, 
    -- Values: 'incoming' (reception from supplier), 'processing' (toolroom preparing order), 'post_delivery' (user complaint after receiving)
    
    issue_category VARCHAR(50) NOT NULL,
    -- Values: 'wrong_material' (incorrect part), 'damaged' (physical damage), 'wrong_quantity' (count mismatch), 'defective' (quality defect), 'other'
    
    description TEXT NOT NULL, -- Detailed description of the issue
    
    -- Context references
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE SET NULL, 
    -- NULL for incoming reports (no ticket yet), populated for processing/post_delivery
    
    incoming_id BIGINT NULL, 
    -- Future reference to incoming_receipts table (when developed)
    
    -- Reporter information
    reported_by_id UUID REFERENCES profiles(id) NOT NULL,
    reported_at TIMESTAMP DEFAULT NOW(),
    
    -- Supplier tracking (for statistics)
    supplier_name VARCHAR(255), -- Name of the supplier who provided the material
    
    -- Action taken
    action_taken VARCHAR(50),
    -- Values: 'rejected' (not accepted), 'returned' (sent back to supplier), 'accepted_with_note' (accepted but documented), 'pending_review'
    
    -- Additional metadata
    quantity_affected INTEGER, -- How many units were affected
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_quality_reports_material ON quality_reports(material_id);
CREATE INDEX idx_quality_reports_ticket ON quality_reports(ticket_id);
CREATE INDEX idx_quality_reports_stage ON quality_reports(report_stage);
CREATE INDEX idx_quality_reports_supplier ON quality_reports(supplier_name);
CREATE INDEX idx_quality_reports_reported_at ON quality_reports(reported_at);

-- Enable Row Level Security
ALTER TABLE quality_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all quality reports
CREATE POLICY "Users can view quality reports"
    ON quality_reports FOR SELECT
    USING (true);

-- Policy: Only authenticated users can create quality reports
CREATE POLICY "Authenticated users can create quality reports"
    ON quality_reports FOR INSERT
    WITH CHECK (auth.uid() = reported_by_id);

-- Policy: Only the reporter or admin can update their reports
CREATE POLICY "Users can update their own quality reports"
    ON quality_reports FOR UPDATE
    USING (
        auth.uid() = reported_by_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor')
        )
    );

-- Policy: Only admin can delete quality reports
CREATE POLICY "Admin can delete quality reports"
    ON quality_reports FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor')
        )
    );

-- Create a view for quality statistics by supplier
CREATE OR REPLACE VIEW quality_reports_by_supplier AS
SELECT 
    supplier_name,
    report_stage,
    issue_category,
    COUNT(*) as report_count,
    SUM(quantity_affected) as total_quantity_affected,
    MIN(reported_at) as first_report,
    MAX(reported_at) as last_report
FROM quality_reports
WHERE supplier_name IS NOT NULL
GROUP BY supplier_name, report_stage, issue_category
ORDER BY report_count DESC;

-- Grant access to the view
GRANT SELECT ON quality_reports_by_supplier TO authenticated;

COMMENT ON TABLE quality_reports IS 'Tracks quality issues with materials across all stages: incoming reception, processing, and post-delivery';
COMMENT ON COLUMN quality_reports.report_stage IS 'Stage where issue was detected: incoming, processing, or post_delivery';
COMMENT ON COLUMN quality_reports.issue_category IS 'Type of quality issue: wrong_material, damaged, wrong_quantity, defective, or other';
COMMENT ON COLUMN quality_reports.action_taken IS 'Action taken in response: rejected, returned, accepted_with_note, or pending_review';
