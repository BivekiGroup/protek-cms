open through pupeteer that open the url statistics page for that item, in the network we should catch an api call that looks like this, it'll follow
after 2 very similar calls. https://www.zzap.ru/user/statpartpricehistory.aspx?code_cat=1752358029&params_hash=d8b7439b145f5bfc775eb4653f6c985e
be carrefull for it to not look like this, this one provides the image instead of data https://www.zzap.ru/user/statpartpricehistory.aspx?
code_cat=1752358029&params_hash=d8b7439b145f5bfc775eb4653f6c985e&DXCache=ASP.user_statpartpricehistory_aspx_ctl00_BodyPlace_QueryWebChartControl&DXRefresh=38a7e4b4-0b12-b42b-369f-683e29000380.
After we scrap the response, we run it through a script that'll look like chartconverter.py in our root and give our the year, month and value for that
month, display them