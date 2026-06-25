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
    d.agent_name AS "Agent_Name",
    d.salesman_name AS "Salesman_Name",
    d.merchant_name AS "Merchant_Name",
    r.selected_date AS "Transaction_Date",
    SUM(CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.gmv ELSE 0 END) AS gmv_day,
    SUM(CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.commission ELSE 0 END) AS commision_day,
    SUM(CASE WHEN d.transaction_date::DATE = r.selected_date THEN d.services_fee ELSE 0 END) AS services_fee_day,
    SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.gmv ELSE 0 END) AS gmv_month,
    SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.commission ELSE 0 END) AS commision_month,
    SUM(CASE WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end THEN d.services_fee ELSE 0 END) AS services_fee_month,
    COUNT(DISTINCT CASE WHEN d.merchant_onboarding_date::DATE = r.selected_date THEN d.merchant_name END) AS onboarding_merchant_day,
    COUNT(DISTINCT CASE WHEN d.merchant_onboarding_date::DATE BETWEEN r.month_start AND r.month_end THEN d.merchant_name END) AS onboarding_merchant_month,
    COUNT(DISTINCT CASE WHEN d.merchant_onboarding_date::DATE BETWEEN r.quarter_start AND r.quarter_end THEN d.merchant_name END) AS onboarding_merchant_quarter,
    COUNT(DISTINCT CASE WHEN d.merchant_onboarding_date::DATE BETWEEN r.year_start AND r.year_end THEN d.merchant_name END) AS onboarding_merchant_year
FROM mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
WHERE 1=1
  AND d.agent_name != 'Charter'
  {% set merchant_filter = filter_values('Merchant_Name') %}
  {% if merchant_filter and merchant_filter|length > 0 and merchant_filter[0] != 'No filter' %}
    AND d.merchant_name IN (
        {% for merchant in merchant_filter %}
            '{{ merchant }}' {% if not loop.last %},{% endif %}
        {% endfor %}
    )
  {% endif %}
GROUP BY d.agent_name, d.salesman_name, d.merchant_name, r.selected_date;