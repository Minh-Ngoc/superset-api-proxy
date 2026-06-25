WITH filter_date_setting AS (
    SELECT CAST(
        {% set date_filter = filter_values('Transaction_Date') %}
        {% if date_filter and date_filter|length > 0 and date_filter[0] != 'No filter' and date_filter[0] != '' %}
            '{{ date_filter[0] }}'
        {% else %}
            CURRENT_DATE::TEXT
        {% endif %}
    AS DATE) AS selected_date
),
date_ranges AS (
    SELECT 
        selected_date,
        DATE_TRUNC('month', selected_date) AS month_start,
        (DATE_TRUNC('month', selected_date) + INTERVAL '1 month' - INTERVAL '1 day') AS month_end,
        DATE_TRUNC('quarter', selected_date) AS quarter_start,
        (DATE_TRUNC('quarter', selected_date) + INTERVAL '3 month' - INTERVAL '1 day') AS quarter_end,
        DATE_TRUNC('year', selected_date) AS year_start,
        (DATE_TRUNC('year', selected_date) + INTERVAL '1 year' - INTERVAL '1 day') AS year_end
    FROM filter_date_setting
)
SELECT 
    'Selected Date' AS "Period",
    (SELECT selected_date FROM date_ranges) AS "Transaction_Date",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.gmv END), 0) AS "Total_GMV",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.commission END), 0) AS "Total_Commission",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.services_fee END), 0) AS "Total_Services_Fee",
    COUNT(DISTINCT CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.merchant_name END) AS "Active_Merchants"
FROM test_mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
UNION ALL
SELECT 
    'This Month' AS "Period",
    (SELECT selected_date FROM date_ranges) AS "Transaction_Date",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.gmv END), 0) AS "Total_GMV",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.commission END), 0) AS "Total_Commission",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.services_fee END), 0) AS "Total_Services_Fee",
    COUNT(DISTINCT CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.merchant_name END) AS "Active_Merchants"
FROM test_mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
UNION ALL
SELECT 
    'This Quarter' AS "Period",
    (SELECT selected_date FROM date_ranges) AS "Transaction_Date",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end THEN d.gmv END), 0) AS "Total_GMV",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end THEN d.commission END) , 0) AS "Total_Commission",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end THEN d.services_fee END), 0) AS "Total_Services_Fee",
    COUNT(DISTINCT CASE WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end THEN d.merchant_name END) AS "Active_Merchants"
FROM test_mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
UNION ALL
SELECT 
    'This Year' AS "Period",
    (SELECT selected_date FROM date_ranges) AS "Transaction_Date",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end THEN d.gmv END), 0) AS "Total_GMV",
    COALESCE(SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end THEN d.commission END), 0) AS "Total_Commission",
    SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end THEN d.services_fee END) AS "Total_Services_Fee",
    COUNT(DISTINCT CASE WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end THEN d.merchant_name END) AS "Active_Merchants"
FROM test_mart.dwh_ecopay_transaction_detail d 
CROSS JOIN date_ranges r;