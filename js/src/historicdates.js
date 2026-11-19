/*
 * Historic Dates Parser - EpiWidJs framework
 *
 * @author     Epigraf Team
 * @contact    jakob.juenger@adwmainz.de
 * @license    http://www.opensource.org/licenses/mit-license.php MIT License
 */

import { DateComponent } from './datecomponent.js';
import { DateRange } from './daterange.js';

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
 *  - A single date can be marked as uncertain with "?" (parseHistoricDateRange).
 *  - A single date consists of one or two partial dates (parseHistoricDateRange).
 *  - Partial dates within a single date are separated by "-", alternatively by "-" (n-dash),
 *    "bis" or "oder" (parseHistoricDateRange).
 *    In ISO 8601 date ranges the slash "/" separates the beginning and end of a time span.
 *
 *  The components of a partial date include:
 *
 *  - 'number' => null,   // A number for the year or century [or null]
 *  - 'day' => ['month' => null, 'day' => null],
 *                         // Month and day in ISO notation [or null for each element]
 *  - 'hour' => ['hour' => null, 'minute' => null, 'second' => null]
 *                         // Hour, minute and second in ISO notation [or null for each element]
 *  - 'fraction' => ['numerator_from' => null, 'numerator_to' => null, 'denominator' => null]
 *                         // Numbers for the fractions of centuries [or null for each element]
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

    static DATE_VERSION = 5;

    // Date time format for sort keys
    static DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

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
     * @returns {Array} Array of DateRange objects
     */
    static parseHistoricDateList(date) {
        // Check if date contains ISO 8601 patterns
        const isoFound = new RegExp(DateComponent.ISO_PATTERN).test(date);

        // Always replace 'und' with ','
        date = date.replace(/und/g, ',');

        if (isoFound) {
            // For ISO dates: split by comma and use ISO parser
            let dates = date.split(',').map(d => DateRange.parseHistoricISODateRange(d));
            return dates;
        } else {
            // For non-ISO dates: also replace '/' with ',' then use regular parser
            date = date.replace(/\//g, ',');
            let dates = date.split(',').map(d => DateRange.parseHistoricDateRange(d));
            return dates;
        }
    }

    /**
     * Serialize a date list to normalized string
     *
     * Uses ' und ' as separator for lists with less than 3 items,
     * and ', ' for lists with 3 or more items.
     *
     * @param {Array} datelist - Array of DateRange objects
     * @returns {string|null} Normalized date string or null if all dates are invalid
     */
    static listToString(datelist) {
        const strings = datelist.map(d => d.normalizedString()).filter(s => s !== null);
        if (strings.length === 0) {
            return null;
        } else if (strings.length < 3) {
            return strings.join(' und ');
        } else {
            return strings.join(', ');
        }
    }

    /**
     * Create a sort key from a list of parsed dates
     *
     * @param {Array} datelist - Array of DateRange objects
     * @returns {string|null} Sort key string or null if all dates are invalid
     */
    static listToKey(datelist) {
        const keys = datelist.map(d => d.makeKey(String(this.DATE_VERSION))).filter(k => k !== null);
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
     * Extract all years from a date range structure as a flat array
     *
     * @param {DateRange} date - A date range object with begin and end keys
     * @returns {Array} Array of year strings covering the entire date range
     */
    static rangeToYears(date) {
        return date.years();
    }

    /**
     * Return a list of years from a list of historic dates
     *
     * @param {Array} datelist - Array of DateRange objects
     * @returns {Array} Array of year strings
     */
    static listToYears(datelist) {
        const years = datelist.map(d => d.years());
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
