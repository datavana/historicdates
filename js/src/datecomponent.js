/*
 * DateComponent - Part of Historic Dates Parser
 *
 * @author     Epigraf Team
 * @contact    jakob.juenger@adwmainz.de
 * @license    http://www.opensource.org/licenses/mit-license.php MIT License
 */

/**
 * Represents a single parsed date component.
 *
 * This class encapsulates date component data and parsing logic,
 * replacing the plain object approach in the original implementation.
 */
export class DateComponent {

    // Units/modifiers/tokens
    static UNIT_CENTURY = 'jahrhundert';
    static UNIT_YEAR = 'jahreszahl';
    static UNIT_DAY = 'tag';
    static UNIT_HOUR = 'stunde';
    static UNIT_MINUTE = 'minute';
    static UNIT_SECOND = 'sekunde';

    static MODIFIER_EARLIER = 'frueher';
    static MODIFIER_LATER = 'spaeter';
    static MODIFIER_BEGIN = 'anfang';
    static MODIFIER_END = 'ende';
    static MODIFIER_MID = 'mitte';
    static MODIFIER_PART = 'teil';
    static MODIFIER_AROUND = 'um';
    static MODIFIER_AFTER = 'nach';
    static MODIFIER_BEFORE = 'vor';

    // ISO 8601 date pattern
    static ISO_PATTERN =
        "(?<sign>[-\+])?(?<year>[0-9]{4})" +
        "(?:" +
        "-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12][0-9]|3[01])" +     // extended
        "|" +
        "(?<month_b>0[1-9]|1[0-2])(?<day_b>0[1-9]|[12][0-9]|3[01])" +   // basic
        ")" +
        "(T(?<hour>[01][0-9]|2[0-3]):(?<minute>[0-5][0-9])(:(?<second>[0-5][0-9](\\.[0-9]+)?))?)?";

    // Priority constants for sort key
    static PRIORITY_END = 0x001;
    static PRIORITY_AROUND = 0x002;
    static PRIORITY_EARLIER = 0x002;
    static PRIORITY_UNCERTAIN = 0x004;

    static TOKEN_MODIFIER = {
        'anfang': DateComponent.MODIFIER_BEGIN,
        'ende': DateComponent.MODIFIER_END,
        'um': DateComponent.MODIFIER_AROUND,
        'mitte': DateComponent.MODIFIER_MID,
        'nach': DateComponent.MODIFIER_AFTER,
        'vor': DateComponent.MODIFIER_BEFORE,
        'früher': DateComponent.MODIFIER_EARLIER,
        'später': DateComponent.MODIFIER_LATER
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

    // A date sort key consists of three reference points.
    // DELTA_DATE holds the offsets with respect to 1 Jan of the anchor year
    static DELTA_DATE = {
        'plain_day': {
            r1: { year: 0, day: 1, second: -1 },
            r2: { year: 0, day: 0, second: 0 },
            r3: { year: 0, day: 1, second: -1 }
        },
        'plain_year': {
            r1: { year: 1, day: 0, second: -1 },
            r2: { year: 0, day: 0, second: 0 },
            r3: { year: 1, day: 0, second: -1 }
        },
        'vor': {
            r1: { year: 0, day: 0, second: 0 },
            r2: { year: -9, day: 0, second: 0 },
            r3: { year: 0, day: 0, second: 0 }
        },
        'um': {
            r1: { year: 1, day: 0, second: -1 },
            r2: { year: -8, day: 0, second: 0 },
            r3: { year: 10, day: 0, second: -1 }
        },
        'nach': {
            r1: { year: 1, day: 0, second: -1 },
            r2: { year: 1, day: 0, second: -1 },
            r3: { year: 10, day: 0, second: -1 }
        },
        'frueher': {
            r1: { year: 1, day: 0, second: -1 },
            r2: { year: -8, day: 0, second: 0 },
            r3: { year: 1, day: 0, second: -1 }
        },
        'spaeter': {
            r1: { year: 1, day: 0, second: -1 },
            r2: { year: 0, day: 0, second: 0 },
            r3: { year: 10, day: 0, second: -1 }
        },
        'plain_century': {
            r1: { year: 101, day: 0, second: -1 },
            r2: { year: 1, day: 0, second: 0 },
            r3: { year: 101, day: 0, second: -1 }
        },
        'anfang': {
            r1: { year: 1, day: 0, second: 0 },
            r2: { year: 1, day: 0, second: 0 },
            r3: { year: 10, day: 0, second: -1 }
        },
        'mitte': {
            r1: { year: 51, day: 0, second: -1 },
            r2: { year: 42, day: 0, second: 0 },
            r3: { year: 60, day: 0, second: -1 }
        },
        'ende': {
            r1: { year: 101, day: 0, second: -1 },
            r2: { year: 92, day: 0, second: 0 },
            r3: { year: 101, day: 0, second: -1 }
        }
    };

    // Properties declared as class fields
    number = null;
    unit = '';
    day = { month: null, day: null };
    hour = { hour: null, minute: null, second: null };
    fraction = { numerator_from: null, numerator_to: null, denominator: null };
    negative = false;
    modifier = '';
    short = false;
    invalid = false;
    isiso = false;
    #refPoints = null;

    /**
     * Create an empty DateComponent instance
     * @returns {DateComponent} New empty instance
     */
    static empty() {
        return new DateComponent();
    }

    /**
     * Parse an ISO 8601 date string
     * Mark result as invalid if parsing fails
     *
     * @param {string} date - ISO 8601 date string
     * @returns {DateComponent} Parsed date component
     */
    static parseHistoricISODate(date) {
        const dat = DateComponent.empty();

        // Trim whitespace and match against ISO pattern
        date = date.trim();
        const regex = new RegExp('^' + DateComponent.ISO_PATTERN + '$');
        const match = date.match(regex);

        if (match) {
            dat.isiso = true;
            dat.unit = DateComponent.UNIT_DAY;
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
                dat.unit = DateComponent.UNIT_HOUR;

                if (match.groups.minute !== undefined) {
                    dat.hour.minute = parseInt(match.groups.minute, 10);
                    dat.unit = DateComponent.UNIT_MINUTE;
                }
                if (match.groups.second !== undefined) {
                    dat.hour.second = parseFloat(match.groups.second);
                    dat.unit = DateComponent.UNIT_SECOND;
                }
            }

            dat.invalid = false;
        } else {
            dat.invalid = true;
        }

        return dat;
    }

    /**
     * Parses a date expressed in natural language
     *
     * @param {string} date - Date string to parse
     * @returns {DateComponent} Parsed date component
     */
    static parseHistoricDate(date) {
        const dat = DateComponent.empty();

        // Modifiers from TOKEN_MODIFIER map
        for (const token in DateComponent.TOKEN_MODIFIER) {
            if (date.includes(token)) {
                dat.modifier = DateComponent.TOKEN_MODIFIER[token];
            }
        }

        // Before or after Christ
        dat.negative = date.includes('bc');

        // Time reference: year number or century
        if (date.includes('jh')) {
            dat.unit = DateComponent.UNIT_CENTURY;
        } else {
            dat.unit = DateComponent.UNIT_YEAR;
        }

        // Extract last number
        let number = DateComponent.stripLastNumber(date);

        // Time reference: century is marked by a period
        if (number.postfix.startsWith('.')) {
            dat.unit = DateComponent.UNIT_CENTURY;
        }

        dat.number = number.number;
        date = number.prefix;

        // Fractions: extract from TOKEN_FRACTIONS equivalent
        if (date.includes('hälfte')) {
            dat.modifier = DateComponent.MODIFIER_PART;
            dat.fraction.denominator = 2;
        } else if (date.includes('drittel')) {
            dat.modifier = DateComponent.MODIFIER_PART;
            dat.fraction.denominator = 3;
        } else if (date.includes('viertel')) {
            dat.modifier = DateComponent.MODIFIER_PART;
            dat.fraction.denominator = 4;
        } else if (date.includes('jahrzehnt')) {
            dat.modifier = DateComponent.MODIFIER_PART;
            dat.fraction.denominator = 10;
        }

        // For century parts: extract numerator
        if (dat.modifier === DateComponent.MODIFIER_PART) {
            number = DateComponent.stripLastNumber(date);
            dat.fraction.numerator_from = number.number;
        }
        // For day information: extract month and day
        else {
            if (date !== '') {
                // Month
                for (const token in DateComponent.TOKEN_MONTHS) {
                    if (date.includes(token)) {
                        dat.day.month = DateComponent.TOKEN_MONTHS[token];
                        break;
                    }
                }

                if (dat.day.month === null) {
                    number = DateComponent.stripLastNumber(date);
                    dat.day.month = number.number;
                    date = number.prefix;
                }

                // Day
                number = DateComponent.stripLastNumber(date);
                dat.day.day = number.number;
            }
        }

        // Validate the date component
        dat.validate();

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
     * Extract the last number from a string
     *
     * Returns an object with the following properties:
     * - prefix: Text before the number
     * - number: The number as integer or null
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
        // Check if character is a digit
        while (j >= 0 && !DateComponent.TOKEN_DIGITS.includes(date[j])) {
            postfix = date[j] + postfix;
            j--;
        }
        let number = '';
        while (j >= 0 && DateComponent.TOKEN_DIGITS.includes(date[j])) {
            number = date[j] + number;
            j--;
        }
        number = (number !== '') ? parseInt(number, 10) : null;
        let prefix = date.substring(0, j + 1);
        return {prefix, number, postfix};
    }

    /**
     * From Object method for backward compatibility
     *
     * @param {Object} data - Plain object with date component data
     * @returns {DateComponent} New DateComponent instance
     */
    static fromObject(data) {
        const instance = new DateComponent();
        instance.number = data.number ?? null;
        instance.unit = data.unit ?? '';
        instance.day = data.day ? {...data.day} : {month: null, day: null};
        instance.hour = data.hour ? {...data.hour} : {hour: null, minute: null, second: null};
        instance.fraction = data.fraction ? {...data.fraction} : {numerator_from: null, numerator_to: null, denominator: null};
        instance.negative = data.negative ?? false;
        instance.modifier = data.modifier ?? '';
        instance.short = data.short ?? false;
        instance.invalid = data.invalid ?? false;
        instance.isiso = data.isiso ?? false;
        return instance;
    }

    /**
     * Create a deep copy of this DateComponent
     *
     * @returns {DateComponent} New DateComponent instance with copied values
     */
    copy() {
        const copy = new DateComponent();
        copy.number = this.number;
        copy.unit = this.unit;
        copy.day = {...this.day};
        copy.hour = {...this.hour};
        copy.fraction = {...this.fraction};
        copy.negative = this.negative;
        copy.modifier = this.modifier;
        copy.short = this.short;
        copy.invalid = this.invalid;
        copy.isiso = this.isiso;
        return copy;
    }

    /**
     * Reset to empty state
     *
     * @returns {DateComponent} this instance
     */
    reset() {
        this.number = null;
        this.unit = '';
        this.day = {month: null, day: null};
        this.hour = {hour: null, minute: null, second: null};
        this.fraction = {numerator_from: null, numerator_to: null, denominator: null};
        this.negative = false;
        this.modifier = '';
        this.short = false;
        this.invalid = false;
        this.isiso = false;
        this.#refPoints = null;
        return this;
    }

    /**
     * Convert to plain object (for backward compatibility)
     *
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            number: this.number,
            unit: this.unit,
            day: {...this.day},
            hour: {...this.hour},
            fraction: {...this.fraction},
            negative: this.negative,
            modifier: this.modifier,
            short: this.short,
            invalid: this.invalid,
            isiso: this.isiso
        };
    }

    /**
     * Validate the date component based on plausibility checks
     *
     * This encapsulates the validation logic that was previously inline.
     * Sets the invalid flag if validation fails.
     *
     * @returns {void}
     */
    validate() {
        // Check for number presence
        if (this.number === null) {
            this.invalid = true;
            return;
        }

        // Validate unit+modifier combinations
        if (this.unit === DateComponent.UNIT_YEAR) {
            if (this.modifier !== '' &&
                this.modifier !== DateComponent.MODIFIER_AROUND &&
                this.modifier !== DateComponent.MODIFIER_BEFORE &&
                this.modifier !== DateComponent.MODIFIER_AFTER &&
                this.modifier !== DateComponent.MODIFIER_EARLIER &&
                this.modifier !== DateComponent.MODIFIER_LATER) {
                this.invalid = true;
            }
        }

        if (this.unit === DateComponent.UNIT_CENTURY) {
            if (this.modifier !== '' &&
                this.modifier !== DateComponent.MODIFIER_BEGIN &&
                this.modifier !== DateComponent.MODIFIER_MID &&
                this.modifier !== DateComponent.MODIFIER_END &&
                this.modifier !== DateComponent.MODIFIER_PART) {
                this.invalid = true;
            }
        }

        // Validate fraction ranges
        if (this.modifier === DateComponent.MODIFIER_PART) {
            if (this.fraction.numerator_from > this.fraction.denominator ||
                this.fraction.numerator_from === 0 ||
                !Object.values(DateComponent.TOKEN_FRACTIONS).includes(this.fraction.denominator)) {
                this.invalid = true;
            }
        }
    }

    /**
     * Convert to normalized human-readable string representation
     *
     * @param {boolean} short - Use abbreviated century notation (e.g., "15." instead of "15. Jh.")
     * @returns {string} Normalized date string, or empty string if invalid
     */
    normalizedString(short = false) {
        let out = '';

        if (this.invalid) {
            return out;
        }

        // === ISO Date Handling
        if (this.isiso) {
            if (this.negative) out += '-';
            out += String(this.number).padStart(4, '0') + '-' +
                (this.day.month !== null ? String(this.day.month).padStart(2, '0') : '01') + '-' +
                (this.day.day !== null ? String(this.day.day).padStart(2, '0') : '01');

            if (this.hour.hour !== null) {
                out += 'T' + String(this.hour.hour).padStart(2, '0');
                if (this.hour.minute !== null) {
                    out += ':' + String(this.hour.minute).padStart(2, '0');
                    if (this.hour.second !== null) {
                        out += ':' + String(Math.trunc(this.hour.second)).padStart(2, '0');
                        const frac = Math.round((this.hour.second % 1) * 1000);
                        if (frac > 0) out += '.' + String(frac).padStart(3, '0');
                    }
                }
            }
            return out;
        }

        const space = ' '; // add space after abbreviation point?

        // === Modifiers (common)
        switch (this.modifier) {
            case DateComponent.MODIFIER_BEGIN:
                out += 'A.' + space;
                break;
            case DateComponent.MODIFIER_MID:
                out += 'M.' + space;
                break;
            case DateComponent.MODIFIER_END:
                out += 'E.' + space;
                break;
            case DateComponent.MODIFIER_AROUND:
                out += 'um' + space;
                break;
            case DateComponent.MODIFIER_BEFORE:
                out += 'vor' + space;
                break;
            case DateComponent.MODIFIER_AFTER:
                out += 'nach' + space;
                break;
            default:
                if (this.modifier === DateComponent.MODIFIER_PART) {
                    out += this.fraction.numerator_from + '.';

                    if (this.fraction.numerator_to !== null) {
                        out += "\u2013" + this.fraction.numerator_to + '.';
                    }

                    switch (this.fraction.denominator) {
                        case 2:
                            out += ' H.' + space;
                            break;
                        case 3:
                            out += ' D.' + space;
                            break;
                        case 4:
                            out += ' V.' + space;
                            break;
                        case 10:
                            out += ' Jz.' + space;
                            break;
                    }
                }
        }

        // === Day/Month
        if (this.day.month !== null) {
            out += String(this.day.month).padStart(2, '0') + '-';
            if (this.day.day !== null) {
                out = String(this.day.day).padStart(2, '0') + '-' + out;
            }
        }

        // === Year/Century
        out += this.number;
        if (this.unit === DateComponent.UNIT_CENTURY) {
            out += (!short ? '. Jh.' : '.');
        }

        // === Negative (before Christ)
        if (this.negative) {
            out += space + 'v. Chr.';
        }

        // === Uncertain modifiers
        if (this.modifier === DateComponent.MODIFIER_EARLIER) {
            out += space + 'o. früher';
        }

        if (this.modifier === DateComponent.MODIFIER_LATER) {
            out += space + 'o. später';
        }

        return out;
    }

    /**
     * Compute a list of reference points for a single historic date
     *
     * @returns {Array} Array of Date objects representing the reference points
     */
    refPoints() {
        if (this.#refPoints) {
            return this.#refPoints;
        }

        let deltaDate = {};
        const sign = this.negative ? -1 : 1;
        let baseYear, dateObjMonth, dateObjDay;

        const DC = DateComponent;

        // Determine unit type and set up deltaDate and baseYear
        if ([DC.UNIT_DAY, DC.UNIT_MINUTE, DC.UNIT_SECOND].includes(this.unit)) {
            deltaDate = DateComponent.DELTA_DATE['plain_day'];
            baseYear = sign * this.number;
        }
        else if (this.unit === DC.UNIT_YEAR) {
            const type = this.modifier === '' ? 'plain_year' : this.modifier;
            deltaDate = DateComponent.DELTA_DATE[type] || DateComponent.DELTA_DATE['plain_year'];
            baseYear = sign * this.number;
            // ISO has a year 0
            if (baseYear < 0) {
                baseYear += 1;
            }
        }
        else if (this.unit === DC.UNIT_CENTURY) {
            // shift by -100 if date is positive
            baseYear = sign * this.number * 100 - (sign + 1) * 50;

            if (this.modifier === DC.MODIFIER_PART) {
                const fraction = this.fraction;
                const denominator = fraction.denominator;
                let frac = Math.floor(100 / denominator);
                let numerator = fraction.numerator_from;
                let adjustThird = 0;

                if (denominator === 3) {
                    // avoid accumulation because of extended interval
                    frac += 1;
                    adjustThird = 1 - numerator;
                }

                let r2 = 1 + (numerator - 1) * frac + adjustThird;
                let r3 = 1 + numerator * frac + adjustThird;

                if (fraction.numerator_to !== null) {
                    numerator = fraction.numerator_to;
                    adjustThird = denominator === 3 ? 1 - numerator : 0;
                    r3 = 1 + numerator * frac + adjustThird;
                }

                deltaDate = {
                    r1: { year: r3, second: -1 },
                    r2: { year: r2 },
                    r3: { year: r3, second: -1 }
                };
            }
            else if (this.modifier !== '') {
                deltaDate = DateComponent.DELTA_DATE[this.modifier] || DateComponent.DELTA_DATE['plain_century'];
            }
            else {
                deltaDate = DateComponent.DELTA_DATE['plain_century'];
            }
        }
        else {
            // Default fallback
            deltaDate = DateComponent.DELTA_DATE['plain_year'];
            baseYear = sign * (this.number || 0);
        }

        // Set month and day for base date
        dateObjMonth = this.day.month !== null ? this.day.month : 1;
        dateObjDay = this.day.day !== null ? this.day.day : 1;

        // Create reference points
        const refPoints = [];
        const deltas = ['r1', 'r2', 'r3'];

        for (const deltaKey of deltas) {
            const delta = deltaDate[deltaKey] || {};
            const baseDate = new Date(1900, dateObjMonth - 1, dateObjDay);
            baseDate.setFullYear(baseYear);
            baseDate.setHours(0, 0, 0, 0);
            const modifiedDate = DateComponent.applyDateDelta(baseDate, delta);
            refPoints.push(modifiedDate);
        }

        this.#refPoints = refPoints;
        return refPoints;
    }

    /**
     * Apply a delta to a Date object
     *
     * @param {Date} dateObj - The date to modify
     * @param {Object} delta - Delta as object with year, day, second keys
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
     * Create sort key components for a single historic date
     *
     * Shift date by 10000 years into the future. Thus, dates before Christ
     * do not break the lexicographic sorting.
     *
     * @param {boolean} uncertain - Whether the date is uncertain
     * @param {string} dateVersion - The date version to use in the key
     * @returns {Array} Array of string key elements
     */
    keyElements(uncertain, dateVersion) {
        const dateRefPoints = this.refPoints();

        const keyElements = dateRefPoints.map(r => {
            // shift date values for negative dates to ensure correct sorting
            const d = new Date(r);
            d.setFullYear(d.getFullYear() + 10000);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` +
                `T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            return iso.padStart(20, '0');
        });

        // Resolve the ambiguity for otherwise identical keys
        // The modifiers lower the priority in the order of appearance in this code block.
        let priority = 0x0000;
        const DC = DateComponent;
        if (this.modifier === DC.MODIFIER_END) {
            priority = priority | 0x001;
        }
        if (this.modifier === DC.MODIFIER_EARLIER) {
            priority = priority | 0x002;
        }
        if (this.modifier === DC.MODIFIER_AROUND) {
            priority = priority | 0x002;
        }
        if (uncertain) {
            priority = priority | 0x004;
        }

        keyElements.push(String(priority).padStart(2, '0'));
        keyElements.push(dateVersion);
        return keyElements;
    }

    /**
     * Get the first and the last year of the parsed date term
     *
     * @returns {Array} A list of two years, the beginning and the end
     */
    span() {
        const refPoints = this.refPoints();
        return [
            refPoints[1].getFullYear().toString(),
            refPoints[2].getFullYear().toString()
        ].filter(y => y !== null && y !== 'NaN');
    }

    /**
     * Check if this is a century date
     * @returns {boolean}
     */
    isCentury() {
        return this.unit === DateComponent.UNIT_CENTURY;
    }

    /**
     * Check if this is a year date
     * @returns {boolean}
     */
    isYear() {
        return this.unit === DateComponent.UNIT_YEAR;
    }

    /**
     * Check if this is a day date
     * @returns {boolean}
     */
    isDay() {
        return this.unit === DateComponent.UNIT_DAY;
    }

    /**
     * Check if this is an hour date
     * @returns {boolean}
     */
    isHour() {
        return this.unit === DateComponent.UNIT_HOUR;
    }

    /**
     * Check if this is a minute date
     * @returns {boolean}
     */
    isMinute() {
        return this.unit === DateComponent.UNIT_MINUTE;
    }

    /**
     * Check if this is a second date
     * @returns {boolean}
     */
    isSecond() {
        return this.unit === DateComponent.UNIT_SECOND;
    }

    /**
     * Check if this date is before Christ
     * @returns {boolean}
     */
    isNegative() {
        return this.negative;
    }

    /**
     * Check if this date component is invalid
     * @returns {boolean}
     */
    isInvalid() {
        return this.invalid;
    }

    /**
     * Check if this date has a modifier
     * @returns {boolean}
     */
    hasModifier() {
        return this.modifier !== '';
    }

    /**
     * Check if this date has a fraction
     * @returns {boolean}
     */
    hasFraction() {
        return this.fraction.numerator_from !== null ||
               this.fraction.numerator_to !== null ||
               this.fraction.denominator !== null;
    }

    /**
     * Get the numeric value
     * @returns {number|null}
     */
    getNumber() {
        return this.number;
    }

    /**
     * Set the numeric value
     * @param {number|null} number
     * @returns {DateComponent}
     */
    setNumber(number) {
        this.number = number;
        return this;
    }

    /**
     * Get the unit
     * @returns {string}
     */
    getUnit() {
        return this.unit;
    }

    /**
     * Set the unit
     * @param {string} unit
     * @returns {DateComponent}
     */
    setUnit(unit) {
        this.unit = unit;
        return this;
    }

    /**
     * Get the modifier
     * @returns {string}
     */
    getModifier() {
        return this.modifier;
    }

    /**
     * Set the modifier
     * @param {string} modifier
     * @returns {DateComponent}
     */
    setModifier(modifier) {
        this.modifier = modifier;
        return this;
    }

    /**
     * Get the day component
     * @returns {Object}
     */
    getDay() {
        return {...this.day};
    }

    /**
     * Get the hour component
     * @returns {Object}
     */
    getHour() {
        return {...this.hour};
    }

    /**
     * Get the fraction component
     * @returns {Object}
     */
    getFraction() {
        return {...this.fraction};
    }

}
