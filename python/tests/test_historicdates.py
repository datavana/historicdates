# tests/test_historicdates.py
import json, pathlib, copy, datetime, pprint
from historicdates import HistoricDates

def test_parse_historic_date():
    date_str = "14. jahrhundert"
    date_obj = copy.deepcopy(HistoricDates.EMPTY_DAT)
    date_obj['number'] = 14
    date_obj['unit'] = 'jahrhundert'
    result = HistoricDates.parse_historic_date(date_str)
    assert date_obj == result

    date_str = "1512"
    date_obj = copy.deepcopy(HistoricDates.EMPTY_DAT)
    date_obj['number'] = 1512
    date_obj['unit'] = 'jahreszahl'
    result = HistoricDates.parse_historic_date(date_str)
    assert date_obj == result

