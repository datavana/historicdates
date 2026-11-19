/*
 * DateRange - Part of Historic Dates Parser
 *
 * @author     Epigraf Team
 * @contact    jakob.juenger@adwmainz.de
 * @license    http://www.opensource.org/licenses/mit-license.php MIT License
 */

import { DateComponent } from './datecomponent.js';

/**
 * Represents a parsed date range with begin and end components.
 *
 * This class encapsulates date range data and parsing logic,
 * replacing the plain object approach in the original implementation.
 */
export class DateRange {

    // Properties declared as class fields
    invalid = false;
    uncertain = false;
    or = false;
    begin = DateComponent.empty();
    end = DateComponent.empty();

    /**
     * Create a new empty DateRange instance
     *
     * @returns {DateRange} New empty instance
     */
    static empty() {
        return new DateRange();
    }

    /**
     * Create a DateRange from a plain object (for backward compatibility)
     *
     * @param {Object} data - Plain object with date range data
     * @returns {DateRange} New DateRange instance
     */
    static fromObject(data) {
        const instance = new DateRange();
        instance.invalid = data.invalid ?? false;
        instance.uncertain = data.uncertain ?? false;
        instance.or = data.or ?? false;
        instance.begin = data.begin ? DateComponent.fromObject(data.begin) : DateComponent.empty();
        instance.end = data.end ? DateComponent.fromObject(data.end) : DateComponent.empty();
        return instance;
    }

    /**
     * Create a deep copy of this DateRange
     *
     * @returns {DateRange} New DateRange instance with copied values
     */
    copy() {
        const copy = new DateRange();
        copy.invalid = this.invalid;
        copy.uncertain = this.uncertain;
        copy.or = this.or;
        copy.begin = this.begin.copy();
        copy.end = this.end.copy();
        return copy;
    }

    /**
     * Reset to empty state
     *
     * @returns {DateRange} this instance
     */
    reset() {
        this.invalid = false;
        this.uncertain = false;
        this.or = false;
        this.begin = DateComponent.empty();
        this.end = DateComponent.empty();
        return this;
    }

    /**
     * Convert to plain object (for backward compatibility)
     *
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            invalid: this.invalid,
            uncertain: this.uncertain,
            or: this.or,
            begin: this.begin.toObject(),
            end: this.end.toObject()
        };
    }

    /**
     * Parse a date range
     *
     * Date ranges can be implicit as in single date terms
     * or explicit as in two date terms connected by a hyphen.
     *
     * Examples:
     * - 16.Jh.
     * - 1510
     * - 1510-1520
     *
     * @param {string} date - A natural language date
     * @returns {DateRange} Parsed date range
     */
    static parseHistoricDateRange(date) {
        date = DateComponent.normalizeDateString(date);

        const dateParsed = DateRange.empty();

        // Uncertain
        dateParsed.uncertain = date.includes('?');
        date = date.replace(/\?/g, '');

        // or/from-to specification
        dateParsed.or = date.includes('oder');
        date = date.replace(/oder/g, '\u2013'); // ndash (U+2013)

        // Separate multiple entries
        const parts = date.split('\u2013');
        const von = parts.length > 0 ? parts[0] : '';
        const bis = parts.length > 1 ? parts[1] : '';

        dateParsed.begin = DateComponent.parseHistoricDate(von);
        dateParsed.end = DateComponent.parseHistoricDate(bis);

        if (dateParsed.begin.isInvalid()) {
            dateParsed.invalid = true;
        }

        // Disambiguate elliptical date specifications
        dateParsed.disambiguate();

        return dateParsed;
    }

    /**
     * Parse an ISO 8601 date range
     *
     * A slash '/' separates the beginning and the end date.
     * Handle uncertainty markers ("?") and "oder" (or) specifications.
     *
     * @param {string} date - An ISO 8601 date range
     * @returns {DateRange} Structured DateRange with components
     */
    static parseHistoricISODateRange(date) {
        const dateParsed = DateRange.empty();

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

        // Separate multiple entries
        const parts = date.split('/');
        const partBegin = parts.length > 0 ? parts[0] : '';
        const partEnd = parts.length > 1 ? parts[1] : '';

        dateParsed.begin = DateComponent.parseHistoricISODate(partBegin);
        dateParsed.end = DateComponent.parseHistoricISODate(partEnd);

        if (dateParsed.begin.isInvalid()) {
            dateParsed.invalid = true;
        }

        return dateParsed;
    }

    /**
     * Disambiguate elliptical date specifications
     *
     * Handles:
     * - Elliptical years (e.g., "1415-16" -> "1415-1416")
     * - Elliptical fractions (e.g., "1.-2. D. 15. Jh.")
     *
     * @returns {DateRange} Modified instance with disambiguated values
     */
    disambiguate() {
        const DC = DateComponent;

        // Elliptical years
        if (
            this.begin.isYear() &&
            this.end.isYear() &&
            !this.begin.isInvalid() &&
            !this.end.isInvalid() &&
            this.begin.getNumber() > this.end.getNumber()
        ) {
            const beginDigits = String(this.begin.getNumber()).length;
            const endDigits = String(this.end.getNumber()).length;
            if (beginDigits > endDigits) {
                const endNumber = String(this.begin.getNumber()).substring(0, beginDigits - endDigits) +
                    String(this.end.getNumber());
                this.end.setNumber(parseInt(endNumber, 10));
                this.end.short = true;
            }
        }

        // Elliptical fractions
        // (1.-2.D.15.Jh.)
        if (this.begin.isCentury() && !this.begin.isInvalid() &&
            this.end.isCentury() && !this.end.isInvalid() &&
            this.end.getFraction().numerator_from !== null &&
            this.end.getFraction().denominator !== null &&
            this.begin.getNumber() < this.end.getFraction().numerator_from) {

            const numerator_from = this.begin.getNumber();
            const numerator_to = this.end.getFraction().numerator_from;

            // Copy end to begin
            this.begin = this.end.copy();
            this.end.invalid = true;

            const fraction = this.begin.getFraction();
            fraction.numerator_from = numerator_from;
            fraction.numerator_to = numerator_to;
            this.begin.fraction = fraction;
        }

        return this;
    }

    /**
     * Serialize a DateRange to a normalized string
     *
     * @returns {string|null} Normalized string or null if invalid
     */
    normalizedString() {
        let out = '';

        // Invalid
        if (this.invalid) {
            return null;
        }

        const short = (!this.end.isInvalid()) && (this.end.isCentury());
        out += this.begin.normalizedString(short);

        if (!this.end.isInvalid()) {
            if (this.or) {
                out += ' oder ';
            }
            else {
                const separator = this.begin.isiso ? '/' : '\u2013';
                out += separator;
            }
        }

        out += this.end.normalizedString(false);

        out = out.trim();
        if (this.uncertain) {
            out += '?';
        }

        return out;
    }

    /**
     * Create sort key elements for a date range
     *
     * @param {string} dateVersion - The date version to use in the key
     * @returns {Array|null} Array of key elements or null if invalid
     */
    makeKey(dateVersion) {
        if (this.invalid) {
            return null;
        }

        const beginRefPoints = this.begin.refPoints();
        const beginKeyElements = this.begin.keyElements(this.uncertain, dateVersion);
        let keyElements = [...beginKeyElements];

        if (!this.end.isInvalid()) {
            const endRefPoints = this.end.refPoints();
            const endKeyElements = this.end.keyElements(this.uncertain, dateVersion);
            keyElements[2] = endKeyElements[2];
            if (!this.or) {
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
     * Extract all years from a date range structure as a flat array.
     *
     * @returns {Array} Array of integer year values covering the entire date range
     */
    years() {
        const years = [];

        if (!this.begin.isInvalid()) {
            years.push(...this.begin.span());
        }
        if (!this.end.isInvalid()) {
            years.push(...this.end.span());
        }

        return years;
    }

    /**
     * Compute reference points for this date range's begin date
     *
     * @returns {Array} Array of Date objects
     */
    refPoints() {
        return this.begin.refPoints();
    }

    /**
     * Check if this is a valid date range
     *
     * @returns {boolean}
     */
    isInvalid() {
        return this.invalid;
    }

    /**
     * Check if this date range is uncertain
     *
     * @returns {boolean}
     */
    isUncertain() {
        return this.uncertain;
    }

    /**
     * Check if this is an "or" specification
     *
     * @returns {boolean}
     */
    isOr() {
        return this.or;
    }

    /**
     * Check if this represents a range (has both begin and end)
     *
     * @returns {boolean}
     */
    isRange() {
        return !this.begin.isInvalid() && !this.end.isInvalid();
    }

    /**
     * Check if this has a valid begin date
     *
     * @returns {boolean}
     */
    hasBegin() {
        return !this.begin.isInvalid();
    }

    /**
     * Check if this has a valid end date
     *
     * @returns {boolean}
     */
    hasEnd() {
        return !this.end.isInvalid();
    }

    /**
     * Get the begin date component
     *
     * @returns {DateComponent}
     */
    getBegin() {
        return this.begin;
    }

    /**
     * Get the end date component
     *
     * @returns {DateComponent}
     */
    getEnd() {
        return this.end;
    }

    /**
     * Set the begin date component
     *
     * @param {DateComponent} begin
     * @returns {DateRange}
     */
    setBegin(begin) {
        this.begin = begin;
        return this;
    }

    /**
     * Set the end date component
     *
     * @param {DateComponent} end
     * @returns {DateRange}
     */
    setEnd(end) {
        this.end = end;
        return this;
    }

}
