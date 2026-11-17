"""
HistoricDates - Class for parsing date information.

Similar to the PHP class HistoricDates in php/src/HistoricDates.php

The text entries are structured as follows:
- Multiple dates are separated by "und" (alternatively by "/" or ",")
- A single date can be marked as uncertain with "?"
- A single date consists of one or two partial dates
- Partial dates within a single date are separated by "-", alternatively by "–" (n-dash),
  "bis" or "oder"

The components of a partial date include:
- 'number': A number for the year or century [or False]
- 'day': {'month': False/int, 'day': False/int}
- 'hour': {'hour': False/int, 'minute': False/int, 'second': False/float}
- 'fraction': {'numerator_from': False/int, 'numerator_to': False/int, 'denominator': False/int}
- 'unit': '', 'jahrhundert', 'jahreszahl', 'tag', 'stunde', 'minute', 'sekunde'
- 'negative': True/False (Before or after Christ)
- 'modifier': '', 'um', 'vor', 'nach', 'oder früher', 'oder später', 'ende', 'anfang', 'mitte', 'teil'
- 'short': True/False
- 'invalid': True/False
- 'isiso': True/False
"""

import re
from datetime import datetime


class HistoricDates:
    # Unit constants
    UNIT_CENTURY = 'jahrhundert'
    UNIT_YEAR = 'jahreszahl'
    UNIT_DAY = 'tag'
    UNIT_HOUR = 'stunde'
    UNIT_MINUTE = 'minute'
    UNIT_SECOND = 'sekunde'

    # Modifier constants
    MODIFIER_EARLIER = 'frueher'
    MODIFIER_LATER = 'spaeter'
    MODIFIER_BEGIN = 'anfang'
    MODIFIER_END = 'ende'
    MODIFIER_MID = 'mitte'
    MODIFIER_PART = 'teil'
    MODIFIER_AROUND = 'um'
    MODIFIER_AFTER = 'nach'
    MODIFIER_BEFORE = 'vor'

    PRIORITY_END = 0x001
    PRIORITY_AROUND = 0x002
    PRIORITY_EARLIER = 0x002
    PRIORITY_UNCERTAIN = 0x004

    TOKEN_MODIFIER = {
        'anfang': MODIFIER_BEGIN,
        'ende': MODIFIER_END,
        'um': MODIFIER_AROUND,
        'mitte': MODIFIER_MID,
        'nach': MODIFIER_AFTER,
        'vor': MODIFIER_BEFORE,
        'früher': MODIFIER_EARLIER,
        'später': MODIFIER_LATER
    }

    TOKEN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

    TOKEN_MONTHS = {
        'jan': 1,
        'feb': 2,
        'mär': 3,
        'apr': 4,
        'mai': 5,
        'jun': 6,
        'jul': 7,
        'aug': 8,
        'sep': 9,
        'okt': 10,
        'nov': 11,
        'dez': 12
    }

    TOKEN_FRACTIONS = {
        'hälfte': 2,
        'drittel': 3,
        'viertel': 4,
        'jahrzehnt': 10
    }

    # ISO pattern for ISO 8601 date strings
    ISO_PATTERN = r'(?P<sign>[-+])?(?P<year>[0-9]{4})(?:-(?P<month>0[1-9]|1[0-2])-(?P<day>0[1-9]|[12][0-9]|3[01])|(?P<month_b>0[1-9]|1[0-2])(?P<day_b>0[1-9]|[12][0-9]|3[01]))(T(?P<hour>[01][0-9]|2[0-3]):(?P<minute>[0-5][0-9])(:(?P<second>[0-5][0-9](\.[0-9]+)?))?)?'

    EMPTY_DAT = {
        'number': False,
        'unit': '',
        'day': {'month': False, 'day': False},
        'hour': {'hour': False, 'minute': False, 'second': False},
        'fraction': {'numerator_from': False, 'numerator_to': False, 'denominator': False},
        'negative': False,
        'modifier': '',
        'short': False,
        'invalid': False,
        'isiso': False
    }

    EMPTY_DATE_ARRAY = {
        'invalid': False,
        'uncertain': False,
        'or': False,
        'begin': None,
        'end': None
    }

    DATE_VERSION = 5

    # DELTA_DATE holds the offsets with respect to 1 Jan of the anchor year
    DELTA_DATE = {
        'plain_day': {
            'r1': {'year': 0, 'day': 1, 'second': -1},
            'r2': {'year': 0, 'day': 0, 'second': 0},
            'r3': {'year': 0, 'day': 1, 'second': -1}
        },
        'plain_year': {
            'r1': {'year': 1, 'day': 0, 'second': -1},
            'r2': {'year': 0, 'day': 0, 'second': 0},
            'r3': {'year': 1, 'day': 0, 'second': -1}
        },
        MODIFIER_BEFORE: {
            'r1': {'year': 0, 'day': 0, 'second': 0},
            'r2': {'year': -9, 'day': 0, 'second': 0},
            'r3': {'year': 0, 'day': 0, 'second': 0}
        },
        MODIFIER_AROUND: {
            'r1': {'year': 1, 'day': 0, 'second': -1},
            'r2': {'year': -8, 'day': 0, 'second': 0},
            'r3': {'year': 10, 'day': 0, 'second': -1}
        },
        MODIFIER_AFTER: {
            'r1': {'year': 1, 'day': 0, 'second': -1},
            'r2': {'year': 1, 'day': 0, 'second': -1},
            'r3': {'year': 10, 'day': 0, 'second': -1}
        },
        MODIFIER_EARLIER: {
            'r1': {'year': 1, 'day': 0, 'second': -1},
            'r2': {'year': -8, 'day': 0, 'second': 0},
            'r3': {'year': 1, 'day': 0, 'second': -1}
        },
        MODIFIER_LATER: {
            'r1': {'year': 1, 'day': 0, 'second': -1},
            'r2': {'year': 0, 'day': 0, 'second': 0},
            'r3': {'year': 10, 'day': 0, 'second': -1}
        },
        'plain_century': {
            'r1': {'year': 101, 'day': 0, 'second': -1},
            'r2': {'year': 1, 'day': 0, 'second': 0},
            'r3': {'year': 101, 'day': 0, 'second': -1}
        },
        MODIFIER_BEGIN: {
            'r1': {'year': 1, 'day': 0, 'second': 0},
            'r2': {'year': 1, 'day': 0, 'second': 0},
            'r3': {'year': 10, 'day': 0, 'second': -1}
        },
        MODIFIER_MID: {
            'r1': {'year': 51, 'day': 0, 'second': -1},
            'r2': {'year': 42, 'day': 0, 'second': 0},
            'r3': {'year': 60, 'day': 0, 'second': -1}
        },
        MODIFIER_END: {
            'r1': {'year': 101, 'day': 0, 'second': -1},
            'r2': {'year': 92, 'day': 0, 'second': 0},
            'r3': {'year': 101, 'day': 0, 'second': -1}
        }
    }

    @staticmethod
    def normalize_date_string(date: str) -> str:
        """
        Normalize a date string by replacing alternatives
        
        @param date: A natural language date
        @return: Normalized string
        """
        n_dash = '\u2013'  # En dash

        # Normalize
        date = date.lower()
        date = date.replace(' ', '')
        date = date.replace('v. chr', 'bc')
        date = date.replace('v.chr', 'bc')
        date = date.replace('bc.', 'bc')
        date = date.replace('oderfrüher', 'früher')
        date = date.replace('o.früher', 'früher')
        date = date.replace('o.f.', 'früher')
        date = date.replace('oderf.', 'früher')
        date = date.replace('o.s.', 'später')
        date = date.replace('oders.', 'später')
        date = date.replace('o.später', 'später')
        date = date.replace('oderspäter', 'später')
        date = date.replace('bis', n_dash)
        date = date.replace('-', n_dash)
        date = date.replace('-', n_dash)
        date = date.replace('—', n_dash)
        date = date.replace('‒', n_dash)
        date = date.replace('o.', 'oder')
        date = date.replace('a.', 'anfang')
        date = date.replace('e.', 'ende')
        date = date.replace('m.', 'mitte')
        date = date.replace('.h.', '.hälfte')
        date = date.replace('.d.', '.drittel')
        date = date.replace('.v.', '.viertel')
        date = date.replace('.jz.', '.jahrzehnt')

        return date

    @staticmethod
    def strip_last_number(date: str) -> dict:
        """
        Extract the last number from string
        
        Returns a dict with the following keys:
        - prefix: Text before the number
        - number: The number as integer or False
        - postfix: Text after the number
        
        Example result for '12.':
        {'number': 12, 'postfix': '.', 'prefix': ''}
        
        Example result for '1. Drittel 12. Jh.':
        {'number': 12, 'postfix': '. Jh.', 'prefix': '1. Drittel '}
        
        @param date: A string
        @return: Dict with parsed number, prefix and postfix
        """
        # Approach the last number
        postfix = ''
        j = len(date) - 1
        while j >= 0 and date[j] not in HistoricDates.TOKEN_DIGITS:
            postfix = date[j] + postfix
            j -= 1

        # Extract last number
        number = ''
        while j >= 0 and date[j] in HistoricDates.TOKEN_DIGITS:
            number = date[j] + number
            j -= 1
        
        if number != '':
            number = int(number)
        else:
            number = False

        # The entire rest before the number
        prefix = date[:j + 1]

        return {'prefix': prefix, 'number': number, 'postfix': postfix}

    @staticmethod
    def parse_historic_date(date: str) -> dict:
        """
        Parse a date expressed in natural language
        
        @param date: date string
        @return: parsed elements as dict
        """
        dat = HistoricDates._copy_empty_dat()

        # Check for modifiers
        for token, modifier in HistoricDates.TOKEN_MODIFIER.items():
            if token in date:
                dat['modifier'] = modifier

        # Before or after Christ
        dat['negative'] = 'bc' in date

        # Time reference: year number or century
        if 'jh' in date:
            dat['unit'] = HistoricDates.UNIT_CENTURY
        else:
            dat['unit'] = HistoricDates.UNIT_YEAR

        # Target last number
        number = HistoricDates.strip_last_number(date)

        # Time reference: century is marked by a period
        if number['postfix'].startswith('.'):
            dat['unit'] = HistoricDates.UNIT_CENTURY

        dat['number'] = number['number']
        date = number['prefix']

        # Check for fractions
        for token, denominator in HistoricDates.TOKEN_FRACTIONS.items():
            if token in date:
                dat['modifier'] = HistoricDates.MODIFIER_PART
                dat['fraction']['denominator'] = denominator

        # For century parts: extract numerator
        if dat['modifier'] == HistoricDates.MODIFIER_PART:
            number = HistoricDates.strip_last_number(date)
            dat['fraction']['numerator_from'] = number['number']
        # For day information: extract month and day
        else:
            if date != '':
                # Month
                month_found = False
                for token, month in HistoricDates.TOKEN_MONTHS.items():
                    if token in date:
                        dat['day']['month'] = month
                        month_found = True
                        break

                if not month_found:
                    number = HistoricDates.strip_last_number(date)
                    dat['day']['month'] = number['number']
                    date = number['prefix']

                # Day
                number = HistoricDates.strip_last_number(date)
                dat['day']['day'] = number['number']

        # Plausibility check
        if dat['number'] is False:
            dat['invalid'] = True

        if (dat['unit'] == HistoricDates.UNIT_YEAR and
            dat['modifier'] != '' and
            dat['modifier'] not in [HistoricDates.MODIFIER_AROUND, HistoricDates.MODIFIER_BEFORE, 
                                      HistoricDates.MODIFIER_AFTER, HistoricDates.MODIFIER_EARLIER, 
                                      HistoricDates.MODIFIER_LATER]):
            dat['invalid'] = True

        if (dat['unit'] == HistoricDates.UNIT_CENTURY and
            dat['modifier'] != '' and
            dat['modifier'] not in [HistoricDates.MODIFIER_BEGIN, HistoricDates.MODIFIER_MID, 
                                      HistoricDates.MODIFIER_END, HistoricDates.MODIFIER_PART]):
            dat['invalid'] = True

        if (dat['modifier'] == HistoricDates.MODIFIER_PART and
            (dat['fraction']['numerator_from'] > dat['fraction']['denominator'] or
                dat['fraction']['numerator_from'] == 0 or
                dat['fraction']['denominator'] not in list(HistoricDates.TOKEN_FRACTIONS.values()))):
            dat['invalid'] = True

        return dat

    @staticmethod
    def disambiguate_date(date_parsed: dict) -> dict:
        """
        Disambiguate by replacing alternatives
        
        Example for elliptical bis-Angabe:
          1415-16
        
        Examples for fractions:
          1.-2. D. 15. Jh.
          2.-3. D. 15. Jh.
        
        @param date_parsed: A date array parsed in parseHistoricDateRange()
        @return: A disambiguated date array
        """
        # Make sure we have begin and end initialized
        if date_parsed.get('begin') is None:
            date_parsed['begin'] = HistoricDates._copy_empty_dat()
        if date_parsed.get('end') is None:
            date_parsed['end'] = HistoricDates._copy_empty_dat()

        # Elliptical years
        if (date_parsed['begin']['unit'] == HistoricDates.UNIT_YEAR and
            date_parsed['end']['unit'] == HistoricDates.UNIT_YEAR and
            not date_parsed['begin']['invalid'] and
            not date_parsed['end']['invalid'] and
            date_parsed['begin']['number'] > date_parsed['end']['number']):
            begin_digits = len(str(date_parsed['begin']['number']))
            end_digits = len(str(date_parsed['end']['number']))
            if begin_digits > end_digits:
                end_number = str(date_parsed['begin']['number'])[:begin_digits - end_digits]
                end_number += str(date_parsed['end']['number'])
                date_parsed['end']['number'] = int(end_number)
                date_parsed['end']['short'] = True

        # Elliptical fractions
        # (1.-2.D.15.Jh.)
        if (date_parsed['begin']['unit'] == HistoricDates.UNIT_CENTURY and not date_parsed['begin']['invalid'] and
            date_parsed['end']['unit'] == HistoricDates.UNIT_CENTURY and not date_parsed['end']['invalid'] and
            date_parsed['end']['fraction']['numerator_from'] is not False and 
            date_parsed['end']['fraction']['denominator'] is not False and
            date_parsed['begin']['number'] < date_parsed['end']['fraction']['numerator_from']):

            numerator_from = date_parsed['begin']['number']
            numerator_to = date_parsed['end']['fraction']['numerator_from']

            date_parsed['begin'] = date_parsed['end'].copy() if hasattr(date_parsed['end'], 'copy') else dict(date_parsed['end'])
            date_parsed['end']['invalid'] = True

            date_parsed['begin']['fraction']['numerator_from'] = numerator_from
            date_parsed['begin']['fraction']['numerator_to'] = numerator_to

        return date_parsed

    @staticmethod
    def _copy_empty_dat() -> dict:
        """Create a deep copy of EMPTY_DAT"""
        return {
            'number': False,
            'unit': '',
            'day': {'month': False, 'day': False},
            'hour': {'hour': False, 'minute': False, 'second': False},
            'fraction': {'numerator_from': False, 'numerator_to': False, 'denominator': False},
            'negative': False,
            'modifier': '',
            'short': False,
            'invalid': False,
            'isiso': False
        }

    @staticmethod
    def _copy_empty_date_array() -> dict:
        """Create a deep copy of EMPTY_DATE_ARRAY"""
        return {
            'invalid': False,
            'uncertain': False,
            'or': False,
            'begin': HistoricDates._copy_empty_dat(),
            'end': HistoricDates._copy_empty_dat()
        }
