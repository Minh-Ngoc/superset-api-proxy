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
    COALESCE(d.agent_name, 'UNKNOWN') AS "Agent_Name",
    COALESCE(d.salesman_name, 'UNKNOWN') AS "Salesman_Name",
    COALESCE(d.merchant_name, 'UNKNOWN') AS "Merchant_Name",
    COALESCE(d.salesman_name, 'UNKNOWN') AS "Salesman_Name",
    COALESCE(d.merchant_name, 'UNKNOWN') AS "Merchant_Name",
    d.hierarchy_phone,  -- ✅ hierarchy_phone
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
  AND COALESCE(d.agent_name, '') != 'Charter'

  {% set merchant_filter = filter_values('Merchant_Name') %}
  {% if merchant_filter and merchant_filter|length > 0 and merchant_filter[0] != 'No filter' %}
    AND d.merchant_name IN (
        {% for merchant in merchant_filter %}
            '{{ merchant }}' {% if not loop.last %},{% endif %}
        {% endfor %}
    )
  {% endif %}

GROUP BY 
    d.agent_name,
    d.salesman_name,
    d.merchant_name,
    d.hierarchy_phone,  -- ✅ hierarchy_phone
    r.selected_date;


* Kiểm tra và chỉnh sửa query
    Review query hiện có để đảm bảo đúng logic.
    Điều chỉnh điều kiện filter (TransactionDate, Period, Merchant) tương thích với Superset.
    Xử lý các edge case dữ liệu (NULLvalue, grouping, filter không hợp lệ).
    Đảm bảo query hoạt động chính xác khi kết hợp với RowLevelSecurity (RLS).
 
 * Tích hợp Row Level Security (RLS)
    Áp dụng RLS theo hierarchy_phone để phân quyền dữ liệu theo user tích hợp từ DMS.
    Kiểm tra và validate kết quả khi áp dụng RLS trong nhiều role và phone khác nhau.
    Kiểm tra lại toàn bộ query trong bối cảnh có RLS để tránh mất dữ liệu hoặc sai lệch kết quả.
 
 * Tạo dashboard "RLS - Sales Data Table" trên domain DEV
    Tạo Charts:
        + Big Number: GMV, Commission, Service Fee (Day) - Dataset: RLS -1.1.1 GMV (Day) + RLS - Transaction_Date
        + Table: Merchant onboarding theo thời gian - Dataset: RLS -1.1.1 GMV (Day)
        + TạoTable/Pivot: hiệu suất theo Agent, Salesman, Merchant - Dataset: RLS -3.1. Agent Performance Detail
    Tạo Dataset:
        + RLS -1.1.1 GMV (Day)
        + RLS -3.1. Agent Performance Detail
        + RLS - Transaction_Date (Dùng trong filter dashboard)
    Chuẩn hóa format hiển thị (VND, number format, layout).
 
 * Tích hợp Superset SDK
    Tạo embedded dashboard trong superset để lấy embeddedId (payload: Thêm domain tích hợp dashboard vào khi tạo embedded)
    Sử dụng Superset Embedded SDK để nhúng dashboard vào frontend (Giả lập).
    Đảm bảo dashboard SDK render dữ liệu đúng với dashboard superset.
    Tích hợp cơ chế lấy guest token động từ backend thông qua API (Giả lập).
    Xử lý các vấn đề liên quan đến auth lifecycle:
        + Kiểm tra và xử lý khi guest token hết hạn (auto refresh guest token).
        + Kiểm tra và xử lý khi session/access token hết hạn từ Superset.
        + Đảm bảo dashboard không bị blank/unauthorized khi token expire.
    Tích hợp Superset Embedded SDK để nhúng dashboard vào hệ thống DMS portal.
 
 * Build API (Giả lập)
    Xây dựng flow authentication hoàn chỉnh với Superset:
        + Login bằng username/password → lấy access_token + refresh_token
        + Call API lấy CSRF token phục vụ các request protected
        + Tích hợp cơ chế refresh token khi access token hết hạn
    Triển khai cache token (Redis):
        + Cache access_token và refresh_token
        + Đảm bảo mọi user từ DMS chỉ dùng 1 account duy nhất
        + Áp dụng proactive refresh khi token gần hết hạn (Cache còn hạn nhưng sắp hết (TTL ≤ 2 phút, tức ~phút 13) → proactive refresh bằng refresh token → cập nhật cache trước khi token hết hạn)
        + Fallback về login nếu refresh token hết hạn
    Tạo Route Guest Token động
        + Lấy access token từ cache
        + Lấy CSRF token mới cho mỗi request
        + Call API qua Superset để generate guest token
        + Không cache guest token (đảm bảo security và đúng scope)
    Tích hợp dynamic RLS vào guest token
        + Inject rule theo hierarchy_phone dựa trên user hiện tại
        + Map dataset tương ứng với dashboard
        + Đảm bảo mỗi request trả về guest token có scope dữ liệu đúng với RLS
 
 * Support DMS tích hợp API (giả lập)


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
    d.hierarchy_phone,
    'Selected Date' AS "Period",
    r.selected_date AS "Transaction_Date",
    -- d.agent_name AS "Agent_Name",
    COALESCE(d.agent_name, 'UNKNOWN') AS "Agent_Name",
    COALESCE(d.salesman_name, 'UNKNOWN') AS "Salesman_Name",
    COALESCE(d.merchant_name, 'UNKNOWN') AS "Merchant_Name",
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE = r.selected_date
                THEN d.gmv
            END
        ),
        0
    ) AS "Total_GMV",
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE = r.selected_date
                THEN d.commission
            END
        ),
        0
    ) AS "Total_Commission",
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE = r.selected_date
                THEN d.services_fee
            END
        ),
        0
    ) AS "Total_Services_Fee",
    COUNT(
        DISTINCT CASE
            WHEN d.transaction_date::DATE = r.selected_date
            THEN d.merchant_name
        END
    ) AS "Active_Merchants"
FROM mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
GROUP BY 
    d.hierarchy_phone, 
    r.selected_date,
    d.agent_name,
    d.salesman_name,
    d.merchant_name

UNION ALL

SELECT
    d.hierarchy_phone,
    'This Month',
    r.selected_date,
    COALESCE(d.agent_name, 'UNKNOWN') AS "Agent_Name",
    COALESCE(d.salesman_name, 'UNKNOWN') AS "Salesman_Name",
    COALESCE(d.merchant_name, 'UNKNOWN') AS "Merchant_Name",
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end
                THEN d.gmv
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end
                THEN d.commission
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end
                THEN d.services_fee
            END
        ),
        0
    ),
    COUNT(
        DISTINCT CASE
            WHEN d.transaction_date::DATE BETWEEN r.month_start AND r.month_end
            THEN d.merchant_name
        END
    )
FROM mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
GROUP BY 
    d.hierarchy_phone, 
    r.selected_date,
    d.agent_name,
    d.salesman_name,
    d.merchant_name

UNION ALL

SELECT
    d.hierarchy_phone,
    'This Quarter',
    r.selected_date,
    COALESCE(d.agent_name, 'UNKNOWN') AS "Agent_Name",
    COALESCE(d.salesman_name, 'UNKNOWN') AS "Salesman_Name",
    COALESCE(d.merchant_name, 'UNKNOWN') AS "Merchant_Name",
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end
                THEN d.gmv
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end
                THEN d.commission
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end
                THEN d.services_fee
            END
        ),
        0
    ),
    COUNT(
        DISTINCT CASE
            WHEN d.transaction_date::DATE BETWEEN r.quarter_start AND r.quarter_end
            THEN d.merchant_name
        END
    )
FROM mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
GROUP BY 
    d.hierarchy_phone, 
    r.selected_date,
    d.agent_name,
    d.salesman_name,
    d.merchant_name

UNION ALL

SELECT
    d.hierarchy_phone,
    'This Year',
    r.selected_date,
    COALESCE(d.agent_name, 'UNKNOWN') AS "Agent_Name",
    COALESCE(d.salesman_name, 'UNKNOWN') AS "Salesman_Name",
    COALESCE(d.merchant_name, 'UNKNOWN') AS "Merchant_Name",
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end
                THEN d.gmv
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end
                THEN d.commission
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end
                THEN d.services_fee
            END
        ),
        0
    ),
    COUNT(
        DISTINCT CASE
            WHEN d.transaction_date::DATE BETWEEN r.year_start AND r.year_end
            THEN d.merchant_name
        END
    )
FROM mart.dwh_ecopay_transaction_detail d
CROSS JOIN date_ranges r
GROUP BY 
    d.hierarchy_phone, 
    r.selected_date,
    d.agent_name,
    d.salesman_name,
    d.merchant_name