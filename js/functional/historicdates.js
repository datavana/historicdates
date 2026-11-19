/*
 * Historic Dates Parser - EpiWidJs framework
 *
 * @author     Epigraf Team
 * @contact    jakob.juenger@adwmainz.de
 * @license    http://www.opensource.org/licenses/mit-license.php MIT License#REPLACE
 *
 */

/**
 *  Class for parsing date information.
 *
 *  Two static functions are essential:
 *
 *  - normalize: check a date and standardize it
 *    so that it can be stored in the database.
 *    It accepts a text entry (e.g., 1.H. 15.Jh.),
 *    parses it, and then generates a normalized text entry.
 *
 *  - encode: accept a text entry and generate a sort key
 *    that can be stored in the database.
 *
 *  The start and end years of time periods can be extracted using the following functions:
 *  - years()
 *  - minyear()
 *  - maxyear()
 *
 *
 *  The text entries are structured as follows and run through
 *  the corresponding functions during parsing:
 *
 *  - Multiple dates are separated by "und" (alternatively by "/" or ",") (parseHistoricDateList)
 *    The slash "/" can only be used if ISO 8601 date ranges are not involved (see single date).
 *  - A single date can be marked as uncertain with “?” (parseHistoricDateRange).
 *  - A single date consists of one or two partial dates (parseHistoricDateRange).
 *  - Partial dates within a single date are separated by "-", alternatively by "–" (n-dash),
 *    "bis" or "oder" (parseHistoricDateRange).
 *    In ISO 8601 date ranges the slash "/" separates the beginning and end of a time span.
 *
 *  The components of a partial date include (parseHistoricDate):
 *
 *  - 'number' => false,   // A number for the year or century [or false]
 *  - 'day' => ['month' => false, 'day' => false],
 *                         // Month and day in ISO notation [or false for each element]
 *  - 'hour' => ['hour' => false, 'minute' => false, 'second' => false]
 *                         // Hour, minute and second in ISO notation [or false for each element]
 *  - 'fraction' => [‘numerator_from’ => false, ‘numerator_to’, ‘denominator’ => false]
 *                         // Numbers for the fractions of centuries [or false for each element]
 *  - 'unit' => '',        // Values: 'jahrhundert', 'jahreszahl', 'tag', 'stunde', 'minute', 'sekunde', or an empty string
 *  - 'negative' => false, // true = before Christ, false = after Christ
 *  - 'modifier' => '',    // Values: 'um', 'vor', 'nach', 'oder früher', 'oder später', 'ende', 'anfang', 'mitte', 'teil', [or an empty string]
 *  - 'short' => false,    // true = short form at the end of a period, e.g. 1922-23 [or false]
 *  - 'invalid' => false   // true = An invalid time specification [or false]
 *
 *  During parsing, different spellings are standardized.
 *
 *  # Date key
 *
 *  The date key is used to establish an order that reflects the following criteria:
 *  - Every date represents a period of time. A date consisting of a year covers the entire year.
 *  - In ascending order, each date is sorted based on its reference point.
 *    It is also ordered according to how far it extends into the past and future.
 *    Date ranges extending further back in time appear before those extending less far back.
 *    Date ranges extending further into the future appear after those that do not extend as far.
 *    Therefore, a potentially older date is sorted before a potentially younger date,
 *    and a potentially younger date is sorted after a potentially older date.
 *
 *  The sort key is a concatenation of three reference points written in ISO 8601 notation.
 *  The ISO date is shifted 10000 years into the future, so that dates before Christ do not break
 *  the lexicographic sorting.
 *  The second and third reference points indicate the start and end of the specified date range.
 *  The first reference point depends on the type of date. Modifiers such as "um", "nach", "Anfang" and "Ende"
 *  play a role here. In most cases, the first and third reference points correspond to each other.
 *  A lexicographic sorting of keys structured in this way implements the above sorting criteria.
 *  The fourth key element is a priority that avoids ambiguity for dates with the same reference points.
 *  The priority depends on the modifiers.
 *  The fifth key element stores the key version.
 *
 *  The content of DELTA_DATE determines how date specifications are interpreted, i.e.,
 *  how far they extend into the past or future relative to the base year of the time specification.
 *
 */
export default class HistoricDates {
    // Fuzzy years (uncertain borders)
    static FUZZY_LONG = 25;
    static FUZZY_SHORT = 10;

    // Units/modifiers/tokens
    static UNIT_CENTURY = 'jahrhundert';
    static UNIT_YEAR = 'jahreszahl';
    static UNIT_DAY = 'tag';
    static UNIT_HOUR = 'stunde';
    static UNIT_MINUTE = 'minute';
    static UNIT_SECOND = 'sekunde';

    // Priority constants for sort key
    static PRIORITY_END = 0x001;
    static PRIORITY_AROUND = 0x002;
    static PRIORITY_EARLIER = 0x002;
    static PRIORITY_UNCERTAIN = 0x004;

    static MODIFIER_EARLIER = 'frueher';
    static MODIFIER_LATER = 'spaeter';
    static MODIFIER_BEGIN = 'anfang';
    static MODIFIER_END = 'ende';
    static MODIFIER_MID = 'mitte';
    static MODIFIER_PART = 'teil';
    static MODIFIER_AROUND = 'um';
    static MODIFIER_AFTER = 'nach';
    static MODIFIER_BEFORE = 'vor';

    static TOKEN_MODIFIER = {
        'anfang': HistoricDates.MODIFIER_BEGIN,
        'ende': HistoricDates.MODIFIER_END,
        'um': HistoricDates.MODIFIER_AROUND,
        'mitte': HistoricDates.MODIFIER_MID,
        'nach': HistoricDates.MODIFIER_AFTER,
        'vor': HistoricDates.MODIFIER_BEFORE,
        'früher': HistoricDates.MODIFIER_EARLIER,
        'später': HistoricDates.MODIFIER_LATER
    };

    static TOKEN_FRACTIONS = {
        'hälfte': 2,
        'drittel': 3,
        'viertel': 4,
        'jahrzehnt': 10
    };


    static TOKEN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    static TOKEN_MONTHS = {
        'jan': 1, 'feb': 2, 'mär': 3, 'apr': 4, 'mai': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'okt': 10, 'nov': 11, 'dez': 12
    };

    // Empty date object template (from PHP EMPTY_DAT)
    static EMPTY_DAT = {
        number: false,
        unit: '',
        day: {month: false, day: false},
        hour: {hour: false, minute: false, second: false},
        fraction: {numerator_from: false, numerator_to: false, denominator: false},
        negative: false,
        modifier: '',
        short: false,
        invalid: false,
        isiso: false
    };

    // Empty date range array template
    static get EMPTY_DATE_RANGE() {
        return {
            invalid: false,
            uncertain: false,
            or: false,
            begin: structuredClone(this.EMPTY_DAT),
            end: structuredClone(this.EMPTY_DAT)
        };
    }

    static DATE_VERSION = 5;

    // Date time format for sort keys
    static DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

    // Delta definitions for reference points
    // Maps date types to their reference point offsets
    static DELTA_DATE = {
        'plain_day':    { r1: { year:   0, day: 1, second: -1 }, r2: { year: 0, day: 0, second: 0 }, r3: { year:   0, day: 1, second: -1 } },
        'plain_year':   { r1: { year:   1, day: 0, second: -1 }, r2: { year: 0, day: 0, second: 0 }, r3: { year:   1, day: 0, second: -1 } },
        'vor':          { r1: { year:   0, day: 0, second:  0 }, r2: { year:-9, day: 0, second:  0 }, r3: { year:   0, day: 0, second:  0 } },
        'um':           { r1: { year:   1, day: 0, second: -1 }, r2: { year:-8, day: 0, second:  0 }, r3: { year:  10, day: 0, second: -1 } },
        'nach':         { r1: { year:   1, day: 0, second: -1 }, r2: { year: 1, day: 0, second: -1 }, r3: { year:  10, day: 0, second: -1 } },
        'frueher':      { r1: { year:   1, day: 0, second: -1 }, r2: { year:-8, day: 0, second:  0 }, r3: { year:   1, day: 0, second: -1 } },
        'spaeter':      { r1: { year:   1, day: 0, second: -1 }, r2: { year: 0, day: 0, second:  0 }, r3: { year:  10, day: 0, second: -1 } },
        'plain_century':{ r1: { year: 101, day: 0, second: -1 }, r2: { year: 1, day: 0, second:  0 }, r3: { year: 101, day: 0, second: -1 } },
        'anfang':       { r1: { year:   1, day: 0, second:  0 }, r2: { year: 1, day: 0, second:  0 }, r3: { year:  10, day: 0, second: -1 } },
        'mitte':        { r1: { year:  51, day: 0, second: -1 }, r2: { year:42, day: 0, second:  0 }, r3: { year:  60, day: 0, second: -1 } },
        'ende':         { r1: { year: 101, day: 0, second: -1 }, r2: { year:92, day: 0, second:  0 }, r3: { year: 101, day: 0, second: -1 } }
    };

    // ISO 8601 date pattern
    static ISO_PATTERN =
        "(?<sign>[-\+])?(?<year>[0-9]{4})" +
        "(?:" +
        "-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12][0-9]|3[01])" +     // extended
        "|" +
        "(?<month_b>0[1-9]|1[0-2])(?<day_b>0[1-9]|[12][0-9]|3[01])" +   // basic
        ")" +
        "(T(?<hour>[01][0-9]|2[0-3]):(?<minute>[0-5][0-9])(:(?<second>[0-5][0-9](\\.[0-9]+)?))?)?";

    /**
     * Normalize a natural language date string
     *
     * @param {string} date - Natural language date string
     * @returns {string|null} Normalized date string or null if invalid
     */
    static normalize(date) {
        let hd = this.parseHistoricDateList(date);
        return this.listToString(hd);
    }

    /**
     * Generate a sort key from a date string
     *
     * @param {string} date - Date string to encode
     * @returns {string|null} Sort key string or null if invalid
     */
    static encode(date) {
        let hd = this.parseHistoricDateList(date);
        return this.listToKey(hd);
    }

    /**
     * Parse a list of historic dates
     *
     * Multiple dates can be separated by "und", "," or "/" (for non-ISO dates).
     * ISO 8601 dates are detected and parsed differently.
     *
     * @param {string} date - Date list string
     * @returns {Array} Array of parsed date range objects
     */
    static parseHistoricDateList(date) {
        // Check if date contains ISO 8601 patterns
        const isoFound = new RegExp(this.ISO_PATTERN).test(date);

        // Always replace 'und' with ','
        date = date.replace(/und/g, ',');

        if (isoFound) {
            // For ISO dates: split by comma and use ISO parser
            let dates = date.split(',').map(d => this.parseHistoricISODateRange(d));
            return dates;
        } else {
            // For non-ISO dates: also replace '/' with ',' then use regular parser
            date = date.replace(/\//g, ',');
            let dates = date.split(',').map(d => this.parseHistoricDateRange(d));
            return dates;
        }
    }

    /**
     * Parse a date range
     *
     * Date ranges can be implicit as in single date terms
     * or explicit as in two date terms connected by a hyphen.
     *
     * @param {string} date - A natural language date
     * @returns {Object} Parsed date range object with begin and end dates
     */
    static parseHistoricDateRange(date) {
        date = this.normalizeDateString(date);

        let dateParsed = this.EMPTY_DATE_RANGE;

        // Uncertain
        dateParsed.uncertain = date.includes('?');
        date = date.replace(/\?/g, '');

        // or/from-to specification
        dateParsed.or = date.includes('oder');
        date = date.replace(/oder/g, '–'); // ndash (U+2013)

        // Separate multiple entries
        let parts = date.split('–');
        let von = parts.length > 0 ? parts[0] : '';
        let bis = parts.length > 1 ? parts[1] : '';

        dateParsed.begin = this.parseHistoricDate(von);
        dateParsed.end = this.parseHistoricDate(bis);

        if (dateParsed.begin.invalid) dateParsed.invalid = true;

        dateParsed = this.disambiguateDate(dateParsed);
        return dateParsed;
    }

    /**
     * Parse an ISO 8601 date range
     * Slash '/' separates beginning and end in ISO ranges
     *
     * @param {string} date - ISO 8601 date range string
     * @returns {Object} Parsed date range
     */
    static parseHistoricISODateRange(date) {
        let dateParsed = this.EMPTY_DATE_RANGE;

        if (date.trim() === '') {
            return dateParsed;
        }

        // Uncertain
        dateParsed.uncertain = date.includes('?');
        date = date.replace(/\?/g, '');

        // or/from-to specification
        dateParsed.or = date.includes('oder');

        // Replace 'oder' and 'bis' with '/' for ISO range separation
        date = date.replace(/oder/g, '/').replace(/bis/g, '/');

        // Separate range entries by '/'
        let parts = date.split('/');
        let partBegin = parts.length > 0 ? parts[0] : '';
        let partEnd = parts.length > 1 ? parts[1] : '';

        dateParsed.begin = this.parseHistoricISODate(partBegin);
        dateParsed.end = this.parseHistoricISODate(partEnd);

        if (dateParsed.begin.invalid) {
            dateParsed.invalid = true;
        }

        return dateParsed;
    }

    /**
     * Parses a date expressed in natural language
     *
     * @param {string} date - Date string to parse
     * @returns {Object} Parsed date object with properties:
     *   - number: Year or century number (or false)
     *   - unit: 'jahrhundert' or 'jahreszahl'
     *   - day: {month: number|false, day: number|false}
     *   - fraction: {numerator_from: number|false, numerator_to: number|false, denominator: number|false}
     *   - negative: true if before Christ
     *   - modifier: 'frueher', 'spaeter', 'anfang', 'ende', 'mitte', 'teil', 'um', 'nach', 'vor', or ''
     *   - short: true if abbreviated form
     *   - invalid: true if date is invalid
     *   - isiso: true if ISO 8601 format
     */
    static parseHistoricDate(date) {
        let dat = structuredClone(this.EMPTY_DAT)

        // Modifiers from TOKEN_MODIFIER map
        for (let token in this.TOKEN_MODIFIER) {
            if (date.includes(token)) {
                dat.modifier = this.TOKEN_MODIFIER[token];
            }
        }

        // Before or after Christ
        dat.negative = date.includes('bc');

        // Time reference: year number or century
        if (date.includes('jh')) {
            dat.unit = this.UNIT_CENTURY;
        } else {
            dat.unit = this.UNIT_YEAR;
        }

        // Extract last number
        let number = this.stripLastNumber(date);

        // Time reference: century is marked by a period
        if (number.postfix.startsWith('.')) {
            dat.unit = this.UNIT_CENTURY;
        }

        dat.number = number.number;
        date = number.prefix;

        // Fractions: extract from TOKEN_FRACTIONS equivalent
        if (date.includes('hälfte')) {
            dat.modifier = this.MODIFIER_PART;
            dat.fraction.denominator = 2;
        } else if (date.includes('drittel')) {
            dat.modifier = this.MODIFIER_PART;
            dat.fraction.denominator = 3;
        } else if (date.includes('viertel')) {
            dat.modifier = this.MODIFIER_PART;
            dat.fraction.denominator = 4;
        } else if (date.includes('jahrzehnt')) {
            dat.modifier = this.MODIFIER_PART;
            dat.fraction.denominator = 10;
        }

        // For century parts: extract numerator
        if (dat.modifier === this.MODIFIER_PART) {
            number = this.stripLastNumber(date);
            dat.fraction.numerator_from = number.number;
        }
        // For day information: extract month and day
        else {
            if (date !== '') {
                // Month
                for (let token in this.TOKEN_MONTHS) {
                    if (date.includes(token)) {
                        dat.day.month = this.TOKEN_MONTHS[token];
                        break;
                    }
                }

                if (dat.day.month === false) {
                    number = this.stripLastNumber(date);
                    dat.day.month = number.number;
                    date = number.prefix;
                }

                // Day
                number = this.stripLastNumber(date);
                dat.day.day = number.number;
            }
        }

        // Plausibility check
        if (dat.number === false) {
            dat.invalid = true;
        }

        if ((dat.unit === this.UNIT_YEAR)
            && dat.modifier !== ''
            && dat.modifier !== this.MODIFIER_AROUND
            && dat.modifier !== this.MODIFIER_BEFORE
            && dat.modifier !== this.MODIFIER_AFTER
            && dat.modifier !== this.MODIFIER_EARLIER
            && dat.modifier !== this.MODIFIER_LATER) {
            dat.invalid = true;
        }

        if ((dat.unit === this.UNIT_CENTURY)
            && dat.modifier !== ''
            && dat.modifier !== this.MODIFIER_BEGIN
            && dat.modifier !== this.MODIFIER_MID
            && dat.modifier !== this.MODIFIER_END
            && dat.modifier !== this.MODIFIER_PART) {
            dat.invalid = true;
        }

        if ((dat.modifier === this.MODIFIER_PART)
            && (
                dat.fraction.numerator_from > dat.fraction.denominator ||
                dat.fraction.numerator_from === 0 ||
                !Object.values(this.TOKEN_FRACTIONS).includes(dat.fraction.denominator)
            )) {
            dat.invalid = true;
        }

        return dat;
    }

    /**
     * Parse an ISO 8601 date string
     * Mark result as invalid if parsing fails
     *
     * @param {string} date - ISO 8601 date string
     * @returns {Object} Parsed date object
     */
    static parseHistoricISODate(date) {
        let dat = structuredClone(this.EMPTY_DAT);

        // Trim whitespace and match against ISO pattern
        date = date.trim();
        const regex = new RegExp('^' + this.ISO_PATTERN + '$');
        const match = date.match(regex);

        if (match) {
            dat.isiso = true;
            dat.unit = this.UNIT_DAY;
            dat.negative = match.groups.sign === '-';
            dat.number = parseInt(match.groups.year, 10);

            // Handle month and day (both extended and basic formats)
            let month = match.groups.month || match.groups.month_b;
            let day = match.groups.day || match.groups.day_b;

            if (month !== undefined) {
                dat.day.month = parseInt(month, 10);
            }
            if (day !== undefined) {
                dat.day.day = parseInt(day, 10);
            }

            // Handle time components
            if (match.groups.hour !== undefined) {
                dat.hour.hour = parseInt(match.groups.hour, 10);
                dat.unit = this.UNIT_HOUR;

                if (match.groups.minute !== undefined) {
                    dat.hour.minute = parseInt(match.groups.minute, 10);
                    dat.unit = this.UNIT_MINUTE;
                }
                if (match.groups.second !== undefined) {
                    dat.hour.second = parseFloat(match.groups.second);
                    dat.unit = this.UNIT_SECOND;
                }
            }

            dat.invalid = false;
        } else {
            dat.invalid = true;
        }

        return dat;
    }

    /**
     * Normalize a date string by replacing alternatives
     *
     * @param {string} date - A natural language date string
     * @returns {string} Normalized date string
     */
    static normalizeDateString(date) {
        const nDash = '\u2013'; // En dash (U+2013)

        // Normalise
        date = date.toLowerCase().replace(/\s+/g, '');

        date = date.replace(/v\.chr(\.|\b)/g, 'bc')
            .replace(/v\.chr/g, 'bc')
            .replace(/bc\./g, 'bc')
            .replace(/oderfrüher/g, 'früher')
            .replace(/o\.früher/g, 'früher')
            .replace(/o\.f\./g, 'früher')
            .replace(/oderf\./g, 'früher')
            .replace(/o\.s\./g, 'später')
            .replace(/oders\./g, 'später')
            .replace(/o\.später/g, 'später')
            .replace(/oderspäter/g, 'später')
            .replace(/bis/g, nDash)
            .replace(/-/g, nDash)
            .replace(/—/g, nDash)
            .replace(/‒/g, nDash)
            .replace(/o\./g, 'oder')
            .replace(/a\./g, 'anfang')
            .replace(/e\./g, 'ende')
            .replace(/m\./g, 'mitte')
            .replace(/\.h\./g, '.hälfte')
            .replace(/\.d\./g, '.drittel')
            .replace(/\.v\./g, '.viertel')
            .replace(/\.jz\./g, '.jahrzehnt');
        return date;
    }

    /**
     * Disambiguate elliptical date specifications
     *
     * Handles cases like:
     * - Elliptical years: 1415-16 (expands to 1415-1416)
     * - Elliptical fractions: 1.-2. D. 15. Jh. (expands to full range)
     *
     * @param {Object} dateParsed - Parsed date range object
     * @returns {Object} Disambiguated date range object
     */
    static disambiguateDate(dateParsed) {
        // Elliptical years
        if (
            dateParsed.begin.unit === this.UNIT_YEAR &&
            dateParsed.end.unit === this.UNIT_YEAR &&
            !dateParsed.begin.invalid &&
            !dateParsed.end.invalid &&
            dateParsed.begin.number > dateParsed.end.number
        ) {
            let beginDigits = String(dateParsed.begin.number).length;
            let endDigits = String(dateParsed.end.number).length;
            if (beginDigits > endDigits) {
                let endNumber = String(dateParsed.begin.number).substring(0, beginDigits - endDigits) +
                    String(dateParsed.end.number);
                dateParsed.end.number = parseInt(endNumber, 10);
                dateParsed.end.short = true;
            }
        }

        // Elliptical fractions
        if (
            dateParsed.begin.unit === this.UNIT_CENTURY && !dateParsed.begin.invalid &&
            dateParsed.end.unit === this.UNIT_CENTURY && !dateParsed.end.invalid &&
            dateParsed.end.fraction.numerator_from && dateParsed.end.fraction.denominator &&
            dateParsed.begin.number < dateParsed.end.fraction.numerator_from
        ) {
            const numerator_from = dateParsed.begin.number;
            const numerator_to = dateParsed.end.fraction.numerator_from;
            dateParsed.begin = {...dateParsed.end};
            dateParsed.end.invalid = true;
            dateParsed.begin.fraction.numerator_from = numerator_from;
            dateParsed.begin.fraction.numerator_to = numerator_to;
        }
        return dateParsed;
    }

    /**
     * Extract the last number from a string
     *
     * Returns an object with the following properties:
     * - prefix: Text before the number
     * - number: The number as integer or false
     * - postfix: Text after the number
     *
     * Example result for '12.':
     * {prefix: '', number: 12, postfix: '.'}
     *
     * Example result for '1. Drittel 12. Jh.':
     * {prefix: '1. Drittel ', number: 12, postfix: '. Jh.'}
     *
     * @param {string} date - A string to parse
     * @returns {Object} Object with prefix, number, and postfix properties
     */
    static stripLastNumber(date) {
        let postfix = '', j = date.length - 1;
        // PHP in_array equivalent: just .includes()
        while (j >= 0 && !this.TOKEN_DIGITS.includes(date[j])) {
            postfix = date[j] + postfix;
            j--;
        }
        let number = '';
        while (j >= 0 && this.TOKEN_DIGITS.includes(date[j])) {
            number = date[j] + number;
            j--;
        }
        number = (number !== '') ? parseInt(number, 10) : false;
        let prefix = date.substring(0, j + 1);
        return {prefix, number, postfix};
    }

    /** Stringify date obj
     *
     * @param date
     * @param short Use abbreviated century notation (e.g., "15." instead of "15. Jh.")
     * @returns {string} Normalized date string, or empty string if date is invalid
     */
    static dateToString(date, short = false) {
        let out = '';
        if (date.invalid) return out;

        // === ISO Date Handling
        if (date.isiso) {
            if (date.negative) out += '-';
            out += String(date.number).padStart(4, '0') + '-' +
                (date.day.month !== false ? String(date.day.month).padStart(2, '0') : '01') + '-' +
                (date.day.day !== false ? String(date.day.day).padStart(2, '0') : '01');

            if (date.hour?.hour !== false) {
                out += 'T' + String(date.hour.hour).padStart(2, '0');
                if (date.hour?.minute !== false) {
                    out += ':' + String(date.hour.minute).padStart(2, '0');
                    if (date.hour?.second !== false) {
                        out += ':' + String(Math.trunc(date.hour.second)).padStart(2, '0');
                        const frac = Math.round((date.hour.second % 1) * 1000);
                        if (frac > 0) out += '.' + String(frac).padStart(3, '0');
                    }
                }
            }
            return out;
        }

        const space = ' ';

        // === Modifiers (common)
        switch (date.modifier) {
            case this.MODIFIER_BEGIN:
                out += 'A.' + space;
                break;
            case this.MODIFIER_MID:
                out += 'M.' + space;
                break;
            case this.MODIFIER_END:
                out += 'E.' + space;
                break;
            case this.MODIFIER_AROUND:
                out += 'um' + space;
                break;
            case this.MODIFIER_BEFORE:
                out += 'vor' + space;
                break;
            case this.MODIFIER_AFTER:
                out += 'nach' + space;
                break;
        }

        // === Century Fractions
        if (date.modifier === this.MODIFIER_PART) {
            out += date.fraction.numerator_from + '.';
            if (date.fraction.numerator_to !== false) {
                out += '–' + date.fraction.numerator_to + '.' + space; // n-dash
            }
            else {
                out += space;
            }
            switch (date.fraction.denominator) {
                case 2:
                    out += 'H.' + space;
                    break;
                case 3:
                    out += 'D.' + space;
                    break;
                case 4:
                    out += 'V.' + space;
                    break;
                case 10:
                    out += 'Jz.' + space;
                    break;
            }
        }

        // === Day/Month
        if (date.day.month !== false) {
            out += String(date.day.month).padStart(2, '0') + '-';
            if (date.day.day !== false) {
                out = String(date.day.day).padStart(2, '0') + '-' + out;
            }
        }

        // === Year/Century
        out += date.number;
        if (date.unit === this.UNIT_CENTURY) out += (!short ? '. Jh.' : '.');

        // === Negative (before Christ)
        if (date.negative) out += space + 'v. Chr.';

        // === Uncertain modifiers
        if (date.modifier === this.MODIFIER_EARLIER) out += space + 'o. früher';
        if (date.modifier === this.MODIFIER_LATER) out += space + 'o. später';
        return out;
    }

    /**
     * Serialize a date range to a normalized string
     *
     */
    static rangeToString(date) {
        if (date.invalid) return null;
        let short = (!date.end.invalid) && (date.end.unit === this.UNIT_CENTURY);
        let out = this.dateToString(date.begin, short);

        if (!date.end.invalid) {
            if (date.or) {
                out += ' oder ';
            } else {
                const separator = date.begin.isiso ? '/' : '–';
                out += separator;
            }
        }

        out += this.dateToString(date.end);

        out = out.trim();
        if (date.uncertain) out += '?';
        return out;
    }

    /**
     * Serialize a date list to normalized string
     *
     * Uses ' und ' as separator for lists with less than 3 items,
     * and ', ' for lists with 3 or more items.
     *
     * @param {Array} datelist - Array of parsed date range objects
     * @returns {string|null} Normalized date string or null if all dates are invalid
     */
    static listToString(datelist) {
        let strings = datelist.map(d => this.rangeToString(d)).filter(s => s !== null);
        if (strings.length === 0) {
            return null;
        } else if (strings.length < 3) {
            return strings.join(' und ');
        } else {
            return strings.join(', ');
        }
    }

    /**
     * Apply a relative date modification to a Date object
     *
     * @param {Date} dateObj - The date to modify
     * @param {Object} delta - Delta object with year, day, second properties (e.g., { year: 1, day: 0, second: -1 })
     * @returns {Date} A new Date object with modifications applied
     */
    static applyDateDelta(dateObj, delta) {
        const result = new Date(dateObj);

        if (!delta) {
            return result;
        }

        if (delta.year !== undefined) {
            result.setFullYear(result.getFullYear() + delta.year);
        }
        if (delta.day !== undefined) {
            result.setDate(result.getDate() + delta.day);
        }
        if (delta.second !== undefined) {
            result.setSeconds(result.getSeconds() + delta.second);
        }

        return result;
    }

    /**
     * Compute a list of reference points for a single historic date
     *
     * Reference points are used for sorting. Each date is represented by
     * 3 reference points (r1, r2, r3) that define how it extends in time.
     *
     * @param {Object} date - A parsed date object
     * @returns {Array} Array of Date objects representing the reference points
     */
    static dateToRefPoints(date) {
        let deltaDate = {};
        const sign = date.negative ? -1 : 1;
        let baseYear, dateObjMonth, dateObjDay;

        // Determine unit type and set up deltaDate and baseYear
        if ([this.UNIT_DAY, this.UNIT_MINUTE, this.UNIT_SECOND].includes(date.unit)) {
            deltaDate = this.DELTA_DATE['plain_day'];
            baseYear = sign * date.number;
        }
        else if (date.unit === this.UNIT_YEAR) {
            const type = date.modifier === '' ? 'plain_year' : date.modifier;
            deltaDate = this.DELTA_DATE[type] || this.DELTA_DATE['plain_year'];
            baseYear = sign * date.number;
            // ISO has a year 0
            if (baseYear < 0) {
                baseYear += 1;
            }
        }
        else if (date.unit === this.UNIT_CENTURY) {
            // shift by -100 if date is positive
            baseYear = sign * date.number * 100 - (sign + 1) * 50;

            if (date.modifier === this.MODIFIER_PART) {
                const denominator = date.fraction.denominator;
                let frac = Math.floor(100 / denominator);
                let numerator = date.fraction.numerator_from;
                let adjustThird = 0;

                if (denominator === 3) {
                    // avoid accumulation because of extended interval
                    frac += 1;
                    adjustThird = 1 - numerator;
                }

                let r2 = 1 + (numerator - 1) * frac + adjustThird;
                let r3 = 1 + numerator * frac + adjustThird;

                if (date.fraction.numerator_to !== false) {
                    numerator = date.fraction.numerator_to;
                    adjustThird = denominator === 3 ? 1 - numerator : 0;
                    r3 = 1 + numerator * frac + adjustThird;
                }

                deltaDate = {
                    r1: { year: r3, second: -1 },
                    r2: { year: r2 },
                    r3: { year: r3, second: -1 }
                };
            }
            else if (date.modifier !== '') {
                deltaDate = this.DELTA_DATE[date.modifier] || this.DELTA_DATE['plain_century'];
            }
            else {
                deltaDate = this.DELTA_DATE['plain_century'];
            }
        }
        else {
            // Default fallback
            deltaDate = this.DELTA_DATE['plain_year'];
            baseYear = sign * (date.number || 0);
        }

        // Set month and day for base date
        dateObjMonth = date.day.month !== false ? date.day.month : 1;
        dateObjDay = date.day.day !== false ? date.day.day : 1;

        // Create reference points
        const refPoints = [];
        const deltas = ['r1', 'r2', 'r3'];

        for (const deltaKey of deltas) {
            const delta = deltaDate[deltaKey] || {};
            const baseDate = new Date(1900, dateObjMonth - 1, dateObjDay);
            baseDate.setFullYear(baseYear);
            baseDate.setHours(0, 0, 0, 0);
            const modifiedDate = this.applyDateDelta(baseDate, delta);
            refPoints.push(modifiedDate);
        }

        return refPoints;
    }

    /**
     * Create sort key components for a single historic date
     *
     * Shift date by 10000 years into the future. Thus, dates before Christ
     * do not break the lexicographic sorting.
     *
     * @param {Array} dateRefPoints - Array of Date objects (reference points)
     * @param {string} modifier - The date modifier
     * @param {boolean} uncertain - Whether the date is uncertain
     * @param {boolean} secondary - Is this the end of a date range? (not used in current implementation)
     * @returns {Array} Array of string key elements
     */
    static dateToKey(dateRefPoints, modifier, uncertain, secondary = false) {
        // Shift date values for negative dates to ensure correct sorting
        // and format as padded strings
        const ISO_YEAR_OFFSET = 10000;
        const pad = (n, len = 2) => String(n).padStart(len, '0');

        const keyElements = dateRefPoints.map(r => {
            const d = new Date(r);
            d.setFullYear(d.getFullYear() + ISO_YEAR_OFFSET);
            const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
                `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            return iso.padStart(20, '0');
        });

        // Resolve the ambiguity for otherwise identical keys
        // The modifiers lower the priority in the order of appearance in this code block.
        let priority = 0x0000;
        if (modifier === this.MODIFIER_END) {
            priority = priority | this.PRIORITY_END;
        }
        if (modifier === this.MODIFIER_EARLIER) {
            priority = priority | this.PRIORITY_EARLIER;
        }
        if (modifier === this.MODIFIER_AROUND) {
            priority = priority | this.PRIORITY_AROUND;
        }
        if (uncertain) {
            priority = priority | this.PRIORITY_UNCERTAIN;
        }

        keyElements.push(String(priority).padStart(2, '0'));
        keyElements.push(String(this.DATE_VERSION));

        return keyElements;
    }

    /**
     * Create sort key elements for a date range
     *
     * @param {Object} date - A date range object with begin and end dates
     * @returns {Array|null} Array of key elements or null if date is invalid
     */
    static rangeToKey(date) {
        if (date.invalid) {
            return null;
        }

        const beginRefPoints = this.dateToRefPoints(date.begin);
        const beginKeyElements = this.dateToKey(beginRefPoints, date.begin.modifier, date.uncertain);
        let keyElements = beginKeyElements.slice();

        if (!date.end.invalid) {
            const endRefPoints = this.dateToRefPoints(date.end);
            const endKeyElements = this.dateToKey(endRefPoints, date.end.modifier, date.uncertain);
            keyElements[2] = endKeyElements[2];
            if (!date.or) {
                keyElements[0] = endKeyElements[0]; // first reference point
                keyElements[3] = endKeyElements[3]; // priority
            }
            // use the earlier date for the key
            else if (endRefPoints[0] < beginRefPoints[0]) {
                keyElements[0] = endKeyElements[0];
                keyElements[1] = endKeyElements[1];
                keyElements[2] = beginKeyElements[2];
                keyElements[3] = endKeyElements[3];
            }
        }

        return keyElements;
    }

    /**
     * Create a sort key from a list of parsed dates
     *
     * @param {Array} datelist - Array of parsed date range objects
     * @returns {string|null} Sort key string or null if all dates are invalid
     */
    static listToKey(datelist) {
        const keys = datelist.map(d => this.rangeToKey(d)).filter(k => k !== null);
        if (keys.length === 0) {
            return null;
        }
        // the first date provides the first reference point
        let outKeys = keys[0];
        if (keys.length > 1) {
            const key1Values = keys.map(k => k[1]);
            const key2Values = keys.map(k => k[2]);
            outKeys[1] = key1Values.reduce((a, b) => a < b ? a : b);
            outKeys[2] = key2Values.reduce((a, b) => a > b ? a : b);
        }
        return outKeys.join('/');
    }

    /**
     * Get the first and the last year of the parsed date term
     *
     * @param {Object} date - A parsed date term
     * @returns {Array} Array of year strings from reference points
     */
    static dateToSpan(date) {
        const refPoints = this.dateToRefPoints(date);
        return [
            refPoints[1].getFullYear().toString(),
            refPoints[2].getFullYear().toString()
        ].filter(y => y !== null);
    }

    /**
     * Extract all years from a date range structure as a flat array
     *
     * @param {Object} date - A date range object with begin and end keys
     * @returns {Array} Array of year strings covering the entire date range
     */
    static rangeToYears(date) {
        let years = [];
        if (!date.begin.invalid) {
            years = years.concat(this.dateToSpan(date.begin));
        }
        if (!date.end.invalid) {
            years = years.concat(this.dateToSpan(date.end));
        }
        return years;
    }

    /**
     * Return a list of years from a list of historic dates
     *
     * @param {Array} datelist - Array of parsed date range objects
     * @returns {Array} Array of year strings
     */
    static listToYears(datelist) {
        const years = datelist.map(d => this.rangeToYears(d));
        return years.flat();
    }

    /**
     * Get the start and end year of a date string
     *
     * @param {string} date - A natural language date
     * @returns {Array} Array of year strings
     */
    static years(date) {
        const hd = this.parseHistoricDateList(date);
        return this.listToYears(hd);
    }

    /**
     * Get start of the date range
     *
     * @param {string} date - The date string
     * @returns {number|null} Minimum year or null if no valid years
     */
    static minyear(date) {
        const years = this.years(date);
        if (years.length === 0) {
            return null;
        }
        return Math.min(...years.map(y => parseInt(y, 10)));
    }

    /**
     * Get end of the date range
     *
     * @param {string} date - The date string
     * @returns {number|null} Maximum year or null if no valid years
     */
    static maxyear(date) {
        const years = this.years(date);
        if (years.length === 0) {
            return null;
        }
        return Math.max(...years.map(y => parseInt(y, 10)));
    }

}

