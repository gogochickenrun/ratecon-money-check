# RateConRisk GA4 Events

Current custom events:

- `ratecon_check_click` — user clicks Check My Rate Con
- `ratecon_upload_selected` — user selects a file
- `ratecon_analysis_started` — analysis request begins
- `ratecon_analysis_success` — analysis returns successfully
- `ratecon_analysis_error` — analysis fails

Useful funnel:
Visitors -> upload_selected -> analysis_started -> analysis_success

No filename or document contents are sent to Google Analytics.


## Owner-operator dashboard events
- `ratecon_save_load_click`
- `fleet_dashboard_view`
- `fleet_load_created`
- `fleet_expense_added`
- `fleet_status_changed`
- `fleet_document_changed`


## V6 cloud / finance events
- `fleet_magic_link_sent`
- `fleet_local_data_migrated`
- `fleet_truck_created`
- `fleet_receivables_view`

Recommended funnel:
Rate Con analyzed → Save as Load → Add Truck → Add Expense → Invoice → Paid → Return next week


## Support event
- `whatsapp_support_click`
  - `support_channel`: `whatsapp`
  - `page_path`
  - `placement`
