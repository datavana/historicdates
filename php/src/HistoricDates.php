<?php
/**
 * Epigraf 5.0
 *
 * @author     Epigraf Team
 * @contact    jakob.juenger@adwmainz.de
 * @license    http://www.opensource.org/licenses/mit-license.php MIT License
 */

namespace App\Utilities\Converters;

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
 *  - Partial dates within a single date are separated by "-", alternatively by "–" (n-dash),
 *    "bis" or "oder" (parseHistoricDateRange).
 *    In ISO 8601 date ranges the slash "/" separates the beginning and end of a time span.
 *
 *  The components of a partial date include (parseHistoricDate):
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
 */
class HistoricDates
{
    /**
     * @const int DATE_VERSION Version number of the date key
     */
    const DATE_VERSION = 5;

    /**
     *  Normalizes a natural language date
     *
     * Parses a date string and generated a new date string
     * from the parsed date
     *
     * @param string $date Natural language date, e.g. "15. Jh."
     * @return string|null Normalized natural language date. Null if the date is invalid.
     */
    static function normalize(string $date): string|null
    {
        $hd = HistoricDates::parseHistoricDateList($date);
        return HistoricDates::listToString($hd);
    }


    /**
     *  Derives a sort key from a natural language date
     *
     * @param string $date A natural language date, e.g. "15. Jh."
     * @return string|null A key that can be used to sort multiple dates. Null if the date is invalid.
     */
    static function encode(string $date): string|null
    {
        $hd = HistoricDates::parseHistoricDateList($date);
        return HistoricDates::listToKey($hd);
    }

    /**
     * Parse a natural language date
     *
     * Multiple dates can be combined with "und", "," or "/".
     * The dash "/" can only be used if no ISO date ranges are involved.
     *
     * @param string $date A natural language date
     * @return DateRange[] An array of DateRange objects
     */
    static function parseHistoricDateList(string $date): array
    {
        // First, determine if the dates are in ISO notation.
        // Processing mixed lists requires somewhat complicated recursive parsing.
        $iso_found = preg_match("~" . DateComponent::ISO_PATTERN . "~", $date);
        $date = str_replace('und', ',', $date);
        if ($iso_found === 1) {
            $dates = explode(',', $date);
            return array_map([DateRange::class, 'parseHistoricISODateRange'], $dates);
        }
        else {
            $date = str_replace('/', ',', $date);
            $dates = explode(',', $date);
            return array_map(DateRange::parseHistoricDateRange(...), $dates);
        }
    }

    /**
     * Serialize a date list to normalized string
     *
     * @param DateRange[] $datelist
     * @return string|null
     */
    static function listToString(array $datelist): string|null
    {
        $datelist = array_filter(
            array_map(fn(DateRange $d) => $d->normalizedString(), $datelist),
            fn($x) => $x !== null
        );
        if (empty($datelist)) {
            return null;
        } else if (count($datelist) < 3) {
            return implode(' und ', $datelist);
        } else {
            return implode(', ', $datelist);
        }
    }


    /**
     * Create a sort key from a list of parsed dates
     *
     * @param DateRange[] $datelist The list of parsed dates
     * @return string|null
     */
    static function listToKey(array $datelist): string|null
    {
        $keys = array_values(array_filter(
            array_map(fn(DateRange $d) => $d->makeKey(self::DATE_VERSION), $datelist),
            fn($x) => $x !== null)
        );
        if (empty($keys)) {
            return null;
        }
        // the first date provides the first reference point
        $outKeys = $keys[0];
        if (count($keys) > 1) {
            $outKeys[1] = min(array_column($keys, 1));
            $outKeys[2] = max(array_column($keys, 2));
        }
        $out = implode('/', $outKeys);
        return $out;
    }



    /**
     * Return a list of years from a list of historic dates
     *
     * @param DateRange[] $datelist
     * @return array
     */
    static function listToYears(array $datelist): array
    {
        $years = array_map(fn($range) => $range->years(), $datelist);
        return array_merge(...$years);
    }


    /**
     *  Get the start and end year of a date string
     *
     * @param string $date A natural language date
     * @return array with keys start and end
     */
    static function years(string $date): array
    {
        $hd = HistoricDates::parseHistoricDateList($date);
        $years = HistoricDates::listToYears($hd);

        return $years;
    }

    /**
     * Get start of the date range
     *
     * @param string $date The date string
     * @return int|null
 */
    static function minyear(string $date): int|null
    {
        $years = HistoricDates::years($date);
        return empty($years) ? null : min($years);
    }

    /**
     * Get end of the date range
     *
     * @param string $date The date string
     * @return int|null
     */
    static function maxyear(string $date): int|null
    {
        $years = HistoricDates::years($date);
        return empty($years) ? null : max($years);
    }
}
