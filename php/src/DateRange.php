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
 * Represents a parsed date range with begin and end components.
 *
 * This class replaces the EMPTY_DATE_ARRAY structure, providing type safety
 * and encapsulating disambiguation logic.
 */
class DateRange
{
    /**
     * @var bool true if the date range is invalid
     */
    public bool $invalid;

    /**
     * @var bool true if the date range is uncertain
     */
    public bool $uncertain;

    /**
     * @var bool true if this is an "or" specification
     */
    public bool $or;

    /**
     * @var DateComponent The beginning of the date range
     */
    public DateComponent $begin;

    /**
     * @var DateComponent The end of the date range
     */
    public DateComponent $end;

    /**
     * Constructor - initializes all properties
     */
    public function __construct()
    {
        $this->invalid = false;
        $this->uncertain = false;
        $this->or = false;
        $this->begin = new DateComponent();
        $this->end = new DateComponent();
    }



    /**
     * Create a new empty DateRange instance
     *
     * @return static
     */
    public static function empty(): static
    {
        return new static();
    }

    /**
     * Create a DateRange from an array (for backward compatibility)
     *
     * @param array $data Array with date range data
     * @return static
     */
    public static function fromArray(array $data): static
    {
        $instance = new static();
        $instance->invalid = $data['invalid'] ?? false;
        $instance->uncertain = $data['uncertain'] ?? false;
        $instance->or = $data['or'] ?? false;
        $instance->begin = isset($data['begin']) ? DateComponent::fromArray($data['begin']) : DateComponent::empty();
        $instance->end = isset($data['end']) ? DateComponent::fromArray($data['end']) : DateComponent::empty();
        return $instance;
    }

    /**
     * Convert to array (for backward compatibility)
     *
     * @return array
     */
    public function toArray(): array
    {
        return [
            'invalid' => $this->invalid,
            'uncertain' => $this->uncertain,
            'or' => $this->or,
            'begin' => $this->begin->toArray(),
            'end' => $this->end->toArray()
        ];
    }

    /**
     * Create a deep copy of this DateRange
     *
     * @return static
     */
    public function copy(): static
    {
        $copy = new static();
        $copy->invalid = $this->invalid;
        $copy->uncertain = $this->uncertain;
        $copy->or = $this->or;
        $copy->begin = $this->begin->copy();
        $copy->end = $this->end->copy();
        return $copy;
    }

    /**
     * Serialize a DateRange to a normalized string
     *
     * @return string|null
     */
    public function normalizedString(): string|null
    {
        $out = '';

        //Invalid
        if ($this->invalid) {
            return null;
        }

        $short = (!$this->end->invalid) && ($this->end->unit === DateComponent::UNIT_CENTURY);
        $out .= $this->begin->normalizedString($short);

        if (!$this->end->invalid) {
            if ($this->or) {
                $out .= ' oder ';
            }
            else {
                $separator = $this->begin->isiso ? '/' : "\u{2013}";
                $out .= $separator;
            }
        }

        $out .= $this->end->normalizedString(false);

        $out = trim($out);
        if ($this->uncertain) {
            $out .= '?';
        }

        return $out;
    }


    /**
     * Parse a date range
     *
     * Date ranges can be implicit as in single date terms
     * or explicit as in two date terms connected by a hyphen.
     *
     * 16.Jh.
     * 1510
     * 1510-1520
     *
     * @param string $date A natural language date
     * @return DateRange
     */
    public static function parseHistoricDateRange(string $date): DateRange
    {
        $date = DateComponent::normalizeDateString($date);

        $date_parsed = self::empty();

        // Uncertain
        $date_parsed->uncertain = str_contains($date, '?');
        $date = str_replace('?', '', $date);

        // or/from-to specification
        $date_parsed->or = str_contains($date, 'oder');
        $date = str_replace('oder', "\u{2013}", $date);

        // Separate multiple entries
        $parts = explode("\u{2013}", $date);
        $parts = ($parts === false) ? [] : $parts;
        $von = (count($parts) > 0) ? $parts[0] : '';
        $bis = (count($parts) > 1) ? $parts[1] : '';

        $date_parsed->begin = DateComponent::parseHistoricDate($von);
        $date_parsed->end = DateComponent::parseHistoricDate($bis);

        if ($date_parsed->begin->invalid) {
            $date_parsed->invalid = true;
        }

        // Disambiguate
        $date_parsed->disambiguate();

        return $date_parsed;
    }

    /**
     * Parse an ISO 8601 date range
     *
     * A slash '/' separates the beginning and the end date.
     * Handle uncertainty markers ("?") and "oder" (or) specifications.
     *
     * @param string $date An ISO 8601 date range
     * @return DateRange Structured DateRange with components
     */
    public static function parseHistoricISODateRange(string $date): DateRange
    {
        $date_parsed = DateRange::empty();

        if (trim($date) === '') {
            return $date_parsed;
        }

        // Uncertain
        $date_parsed->uncertain = str_contains($date, '?');
        $date = str_replace('?', '', $date);

        // or/from-to specification
        $date_parsed->or = str_contains($date, 'oder');

        // Separate multiple entries
        $date = str_replace('oder', '/', $date);
        $date = str_replace('bis', '/', $date);
        $parts = explode('/', $date);
        $part_begin = (count($parts) > 0) ? $parts[0] : '';
        $part_end = (count($parts) > 1) ? $parts[1] : '';

        $date_parsed->begin = DateComponent::parseHistoricISODate($part_begin);
        $date_parsed->end = DateComponent::parseHistoricISODate($part_end);

        if ($date_parsed->begin->invalid) {
            $date_parsed->invalid = true;
        }

        return $date_parsed;
    }



    /**
     * Disambiguate elliptical date specifications
     *
     * Handles:
     * - Elliptical years (e.g., "1415-16" -> "1415-1416")
     * - Elliptical fractions (e.g., "1.-2. D. 15. Jh.")
     *
     * @return static Modified instance with disambiguated values
     */
    public function disambiguate(): static
    {
        // Elliptical years
        if ($this->begin->unit === DateComponent::UNIT_YEAR &&
            $this->end->unit === DateComponent::UNIT_YEAR &&
            !$this->begin->invalid &&
            !$this->end->invalid &&
            $this->begin->number > $this->end->number) {

            $begin_digits = strlen((string)$this->begin->number);
            $end_digits = strlen((string)$this->end->number);
            if ($begin_digits > $end_digits) {
                $end_number = substr((string)$this->begin->number, 0, $begin_digits - $end_digits);
                $end_number .= $this->end->number;
                $this->end->number = (int)$end_number;
                $this->end->short = true;
            }
        }

        // Elliptical fractions
        // (1.-2.D.15.Jh.)
        if ($this->begin->unit === DateComponent::UNIT_CENTURY && !$this->begin->invalid &&
            $this->end->unit === DateComponent::UNIT_CENTURY && !$this->end->invalid &&
            $this->end->fraction['numerator_from'] !== null &&
            $this->end->fraction['denominator'] !== null &&
            $this->begin->number < $this->end->fraction['numerator_from']) {

            $numerator_from = $this->begin->number;
            $numerator_to = $this->end->fraction['numerator_from'];

            // Copy end to begin
            $this->begin = $this->end->copy();
            $this->end->invalid = true;

            $this->begin->fraction['numerator_from'] = $numerator_from;
            $this->begin->fraction['numerator_to'] = $numerator_to;
        }

        return $this;
    }

    /**
     * Check if this is a valid date range
     *
     * @return bool
     */
    public function isInvalid(): bool
    {
        return $this->invalid;
    }

    /**
     * Check if this date range is uncertain
     *
     * @return bool
     */
    public function isUncertain(): bool
    {
        return $this->uncertain;
    }

    /**
     * Check if this is an "or" specification
     *
     * @return bool
     */
    public function isOr(): bool
    {
        return $this->or;
    }

    /**
     * Check if this represents a range (has both begin and end)
     *
     * @return bool
     */
    public function isRange(): bool
    {
        return !$this->begin->invalid && !$this->end->invalid;
    }

    /**
     * Check if this has a valid begin date
     *
     * @return bool
     */
    public function hasBegin(): bool
    {
        return !$this->begin->invalid;
    }

    /**
     * Check if this has a valid end date
     *
     * @return bool
     */
    public function hasEnd(): bool
    {
        return !$this->end->invalid;
    }

    /**
     * Get the begin date component
     *
     * @return DateComponent
     */
    public function getBegin(): DateComponent
    {
        return $this->begin;
    }

    /**
     * Get the end date component
     *
     * @return DateComponent
     */
    public function getEnd(): DateComponent
    {
        return $this->end;
    }

    /**
     * Set the begin date component
     *
     * @param DateComponent $begin
     * @return static
     */
    public function setBegin(DateComponent $begin): static
    {
        $this->begin = $begin;
        return $this;
    }

    /**
     * Set the end date component
     *
     * @param DateComponent $end
     * @return static
     */
    public function setEnd(DateComponent $end): static
    {
        $this->end = $end;
        return $this;
    }

    /**
     * Reset to empty state
     *
     * @return static
     */
    public function reset(): static
    {
        $this->invalid = false;
        $this->uncertain = false;
        $this->or = false;
        $this->begin = new DateComponent();
        $this->end = new DateComponent();
        return $this;
    }

    /**
     * Create sort key elements for a date range
     *
     * @param string $dateVersion
     * @return array|null
     */
    public function makeKey(string $dateVersion): array|null
    {
        if ($this->invalid) {
            return null;
        }

        $beginRefPoints = $this->begin->refPoints();
        $beginKeyElements = $this->begin->keyElements($this->uncertain, $dateVersion);
        $keyElements = $beginKeyElements;
        if (!$this->end->invalid) {
            $endRefPoints = $this->end->refPoints();
            $endKeyElements = $this->end->keyElements($this->uncertain, $dateVersion);
            $keyElements[2] = $endKeyElements[2];
            if (!$this->or) {
                $keyElements[0] = $endKeyElements[0]; // first reference point
                $keyElements[3] = $endKeyElements[3]; // priority
            }
            // use the earlier date for the key
            elseif ($endRefPoints[0] < $beginRefPoints[0]) {
                $keyElements[0] = $endKeyElements[0];
                $keyElements[1] = $endKeyElements[1];
                $keyElements[2] = $beginKeyElements[2];
                $keyElements[3] = $endKeyElements[3];
            }
        }
        else {
            $keyElements = $beginKeyElements;
        }
        return $keyElements;
    }

    /**
     * Extract all years from a date range structure as a flat array.
     *
     * @return array Array of integer year values covering the entire date range
     */
    public function years(): array
    {
        $years = [];

        if (!$this->begin->invalid) {
            $years = array_merge($years, $this->begin->span());
        }
        if (!$this->end->invalid) {
            $years = array_merge($years, $this->end->span());
        }

        return $years;
    }


}
