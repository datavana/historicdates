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
 * Represents a single parsed date component.
 *
 * This class replaces the EMPTY_DAT array structure, providing type safety
 * and encapsulating validation logic.
 */
class DateComponent
{
    /**
     * Patterns
     *
     * @const string ISO_PATTERN Pattern for ISO 8601 date strings (e.g. 2023-10-05T14:30:00)
     */
    public const ISO_PATTERN =
        "(?<sign>[-+])?(?<year>[0-9]{4})"
        . "(?:"
        .   "-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12][0-9]|3[01])"       // extended
        . "|"
        .   "(?<month_b>0[1-9]|1[0-2])(?<day_b>0[1-9]|[12][0-9]|3[01])"     // basic
        . ")"
        . "(T(?<hour>[01][0-9]|2[0-3]):(?<minute>[0-5][0-9])(:(?<second>[0-5][0-9](\.[0-9]+)?))?)?";
    /**
     * Date unit constants
     */
    const UNIT_CENTURY = 'jahrhundert';
    const UNIT_YEAR = 'jahreszahl';
    const UNIT_DAY = 'tag';
    const UNIT_HOUR = 'stunde';
    const UNIT_MINUTE = 'minute';
    const UNIT_SECOND = 'sekunde';

    /**
     * Formats
     */
    const DATE_TIME_FORMAT = 'Y-m-d\TH:i:s';

    /**
     * Modifier constants
     */
    const MODIFIER_EARLIER = 'frueher';
    const MODIFIER_LATER = 'spaeter';
    const MODIFIER_BEGIN = 'anfang';
    const MODIFIER_END = 'ende';
    const MODIFIER_MID = 'mitte';
    const MODIFIER_PART = 'teil';
    const MODIFIER_AROUND = 'um';
    const MODIFIER_AFTER = 'nach';
    const MODIFIER_BEFORE = 'vor';
    const PRIORITY_END = 0x001;
    const PRIORITY_AROUND = 0x002;
    const PRIORITY_EARLIER = 0x002;
    const PRIORITY_UNCERTAIN = 0x004;

    const array TOKEN_FRACTIONS = [
        'hälfte' =>  2,
        'drittel' => 3,
        'viertel' => 4,
        'jahrzehnt' => 10
    ];

    const array TOKEN_MODIFIER = [
        'anfang' => self::MODIFIER_BEGIN,
        'ende' => self::MODIFIER_END,
        'um' => self::MODIFIER_AROUND,
        'mitte' => self::MODIFIER_MID,
        'nach' => self::MODIFIER_AFTER,
        'vor' => self::MODIFIER_BEFORE,
        'früher' => self::MODIFIER_EARLIER,
        'später' => self::MODIFIER_LATER
    ];

    const TOKEN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const TOKEN_MONTHS = [
        'jan' => 1,
        'feb' => 2,
        'mär' => 3,
        'apr' => 4,
        'mai' => 5,
        'jun' => 6,
        'jul' => 7,
        'aug' => 8,
        'sep' => 9,
        'okt' => 10,
        'nov' => 11,
        'dez' => 12
    ];

    // A date sort key consists of three reference points.
    // DELTA_DATE holds the offsets with respect to 1 Jan of the anchor year
    const DELTA_DATE = [
        'plain_day' => [
            'r1' => ['year' => 0, 'day' => 1, 'second' => -1],
            'r2' => ['year' => 0, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 0, 'day' => 1, 'second' => -1]
        ],
        'plain_year' => [
            'r1' => ['year' => 1, 'day' => 0, 'second' => -1],
            'r2' => ['year' => 0, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 1, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_BEFORE => [
            'r1' => ['year' => 0, 'day' => 0, 'second' => 0],
            'r2' => ['year' => -9, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 0, 'day' => 0, 'second' => 0]
        ],
        self::MODIFIER_AROUND  => [
            'r1' => ['year' => 1, 'day' => 0, 'second' => -1],
            'r2' => ['year' => -8, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 10, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_AFTER => [
            'r1' => ['year' => 1, 'day' => 0, 'second' => -1],
            'r2' => ['year' => 1, 'day' => 0, 'second' => -1],
            'r3' => ['year' => 10, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_EARLIER => [
            'r1' => ['year' => 1, 'day' => 0, 'second' => -1],
            'r2' => ['year' => -8, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 1, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_LATER => [
            'r1' => ['year' => 1, 'day' => 0, 'second' => -1],
            'r2' => ['year' => 0, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 10, 'day' => 0, 'second' => -1]
        ],
        'plain_century' => [
            'r1' => ['year' => 101, 'day' => 0, 'second' => -1],
            'r2' => ['year' => 1, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 101, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_BEGIN => [
            'r1' => ['year' => 1, 'day' => 0, 'second' => 0],
            'r2' => ['year' => 1, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 10, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_MID => [
            'r1' => ['year' => 51, 'day' => 0, 'second' => -1],
            'r2' => ['year' => 42, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 60, 'day' => 0, 'second' => -1]
        ],
        self::MODIFIER_END => [
            'r1' => ['year' => 101, 'day' => 0, 'second' => -1],
            'r2' => ['year' => 92, 'day' => 0, 'second' => 0],
            'r3' => ['year' => 101, 'day' => 0, 'second' => -1]
        ]
    ];


    /**
     * @var int|null A number for the year or century [or null]
     */
    public ?int $number;

    /**
     * @var string Unit: 'jahrhundert', 'jahreszahl', 'tag', 'stunde', 'minute', 'sekunde', or empty
     */
    public string $unit;

    /**
     * @var array{'month': int|null, 'day': int|null} Month and day in ISO notation
     */
    public array $day;

    /**
     * @var array{'hour': int|null, 'minute': int|null, 'second': int|float|null} Hour, minute and second
     */
    public array $hour;

    /**
     * @var array{'numerator_from': int|null, 'numerator_to': int|null, 'denominator': int|null} Fraction numbers
     */
    public array $fraction;

    /**
     * @var bool true = before Christ, false = after Christ
     */
    public bool $negative;

    /**
     * @var string Modifier: 'um', 'vor', 'nach', 'oder früher', 'oder später', 'ende', 'anfang', 'mitte', 'teil', or empty
     */
    public string $modifier;

    /**
     * @var bool true = short form at the end of a period, e.g. 1922-23
     */
    public bool $short;

    /**
     * @var bool true = An invalid time specification
     */
    public bool $invalid;

    /**
     * @var bool true = ISO 8601 date
     */
    public bool $isiso;

    /**
     * @var array reference points for a key
     */
    private array $refPoints = [];

    /**
     * Constructor - initializes all properties
     */
    public function __construct()
    {
        $this->number = null;
        $this->unit = '';
        $this->day = ['month' => null, 'day' => null];
        $this->hour = ['hour' => null, 'minute' => null, 'second' => null];
        $this->fraction = ['numerator_from' => null, 'numerator_to' => null, 'denominator' => null];
        $this->negative = false;
        $this->modifier = '';
        $this->short = false;
        $this->invalid = false;
        $this->isiso = false;
    }

    /**
     * Create a new empty DateComponent instance
     *
     * @return static
     */
    public static function empty(): static
    {
        return new static();
    }

    /**
     * Create a DateComponent from an array (for backward compatibility)
     *
     * @param array $data Array with date component data
     * @return static
     */
    public static function fromArray(array $data): static
    {
        $instance = new static();
        $instance->number = $data['number'] ?? null;
        $instance->unit = $data['unit'] ?? '';
        $instance->day = $data['day'] ?? ['month' => null, 'day' => null];
        $instance->hour = $data['hour'] ?? ['hour' => null, 'minute' => null, 'second' => null];
        $instance->fraction = $data['fraction'] ?? ['numerator_from' => null, 'numerator_to' => null, 'denominator' => null];
        $instance->negative = $data['negative'] ?? false;
        $instance->modifier = $data['modifier'] ?? '';
        $instance->short = $data['short'] ?? false;
        $instance->invalid = $data['invalid'] ?? false;
        $instance->isiso = $data['isiso'] ?? false;
        return $instance;
    }

    /**
     * Convert to array (for backward compatibility)
     *
     * @return array
     */
    public function reset(): static
    {
        $this->number = null;
        $this->unit = '';
        $this->day = ['month' => null, 'day' => null];
        $this->hour = ['hour' => null, 'minute' => null, 'second' => null];
        $this->fraction = ['numerator_from' => null, 'numerator_to' => null, 'denominator' => null];
        $this->negative = false;
        $this->modifier = '';
        $this->short = false;
        $this->invalid = false;
        $this->isiso = false;
        $this->refPoints = [];
        return $this;
    }
    public function copy(): static
    {
        $copy = new static();
        $copy->number = $this->number;
        $copy->unit = $this->unit;
        $copy->day = $this->day;
        $copy->hour = $this->hour;
        $copy->fraction = $this->fraction;
        $copy->negative = $this->negative;
        $copy->modifier = $this->modifier;
        $copy->short = $this->short;
        $copy->invalid = $this->invalid;
        $copy->isiso = $this->isiso;
        return $copy;
    }

    /**
     * Parse a date expressed in natural language
     *
     * @param string $date date
     * @return DateComponent parsed elements
     */
    static function parseHistoricDate(string $date): DateComponent
    {
        $dat = DateComponent::empty();

        foreach (self::TOKEN_MODIFIER as $token => $modifier) {
            if (strpos($date, $token) !== false) {
                $dat->modifier = $modifier;
            }
        }

        // Before or after Christ
        $dat->negative = strpos($date, 'bc') !== false;

        // Time reference: year number or century
        if (strpos($date, 'jh') !== false) {
            $dat->unit = self::UNIT_CENTURY;
        }
        else {
            $dat->unit = self::UNIT_YEAR;
        }

        // Target last number
        $number = self::stripLastNumber($date);

        // Time reference: century is marked by a period
        if (str_starts_with($number['postfix'], '.')) {
            $dat->unit = self::UNIT_CENTURY;
        }

        $dat->number = $number['number'];
        $date = $number['prefix'];

        foreach (self::TOKEN_FRACTIONS as $token => $denominator) {
            if (strpos($date, $token) !== false) {
                $dat->modifier = self::MODIFIER_PART;
                $dat->fraction['denominator'] = $denominator;
            }
        }


        // For century parts: extract numerator
        if ($dat->modifier == self::MODIFIER_PART) {
            $number = self::stripLastNumber($date);
            $dat->fraction['numerator_from'] = $number['number'];
        }
        // For day information: extract month and day
        else {
            if ($date !== '') {
                // Month
                foreach (self::TOKEN_MONTHS as $token => $month) {
                    if (strpos($date, $token) !== false) {
                        $dat->day['month'] = $month;
                        break;
                    }
                }

                if ($dat->day['month'] === null) {
                    $number = self::stripLastNumber($date);
                    $dat->day['month'] = $number['number'];
                    $date = $number['prefix'];
                }

                // Day
                $number = self::stripLastNumber($date);
                $dat->day['day'] = $number['number'];
            }
        }

        // Validate the date component
        $dat->validate();

        return $dat;
    }


    /**
     * Parse an ISO 8601 date string
     *
     * Mark the result as 'invalid', if parsing is not successful.
     *
     * @param string $date ISO 8601 date string
     * @return DateComponent Structured DateComponent with date components
     */
    static function parseHistoricISODate(string $date): DateComponent
    {
        $dat = DateComponent::empty();

        $matches = [];
        $iso_found = preg_match("~" . self::ISO_PATTERN . "~", $date, $matches);
        if ($iso_found === 1) {
            $dat->isiso = true;
            $dat->unit = self::UNIT_DAY;
            $dat->negative = $matches['sign'] == '-';
            $dat->number = $matches['year'];

            if (isset($matches['month_b']) && ($matches['month_b'] !== '')) {
                $matches['month'] = $matches['month_b'];
            }
            if (isset($matches['day_b']) && ($matches['day_b'] !== '')) {
                $matches['day'] = $matches['day_b'];
            }
            $dat->day = ['month' => $matches['month'], 'day' => $matches['day']];

            if (array_key_exists('hour', $matches)) {
                $dat->hour['hour'] = $matches['hour'];
                $dat->unit = self::UNIT_HOUR;
                if (array_key_exists('minute', $matches)) {
                    $dat->hour['minute'] = $matches['minute'];
                    $dat->unit = self::UNIT_MINUTE;
                }
                if (array_key_exists('second', $matches)) {
                    $dat->hour['second'] = $matches['second'];
                    $dat->unit = self::UNIT_SECOND;
                }
            }
            $dat->invalid = false;
        }
        else {
            $dat->invalid = true;
        }
        return $dat;
    }

    /**
     * Normalize a date string by replacing alternatives
     *
     * @param string $date A natural language date
     * @return string
     */
    static function normalizeDateString(string $date): string
    {
        $nDash = "\u{2013}"; // En dash

        // Normalise
        $date = mb_strtolower($date);
        $date = str_replace(' ', '', $date);
        $date = str_replace('v. chr', 'bc', $date);
        $date = str_replace('v.chr', 'bc', $date);
        $date = str_replace('bc.', 'bc', $date);
        $date = str_replace('oderfrüher', 'früher', $date);
        $date = str_replace('o.früher', 'früher', $date);
        $date = str_replace('o.f.', 'früher', $date);
        $date = str_replace('oderf.', 'früher', $date);
        $date = str_replace('o.s.', 'später', $date);
        $date = str_replace('oders.', 'später', $date);
        $date = str_replace('o.später', 'später', $date);
        $date = str_replace('oderspäter', 'später', $date);
        $date = str_replace('bis', $nDash, $date);
        $date = str_replace('-', $nDash, $date);
        $date = str_replace('-', $nDash, $date);
        $date = str_replace('—', $nDash, $date);
        // $date = str_replace("\u{2013}", $nDash, $date);
        $date = str_replace('o.', 'oder', $date);
        $date = str_replace('a.', 'anfang', $date);
        $date = str_replace('e.', 'ende', $date);
        $date = str_replace('m.', 'mitte', $date);
        $date = str_replace('.h.', '.hälfte', $date);
        $date = str_replace('.d.', '.drittel', $date);
        $date = str_replace('.v.', '.viertel', $date);
        $date = str_replace('.jz.', '.jahrzehnt', $date);

        return $date;
    }

    /**
     * Extract the last number from string
     *
     * Returns an array with the following keys
     * - prefix: Text before the number
     * - number: The number as integer or null
     * - postfix: Text after the number
     *
     * Example result for '12.':
     * ['number' => 12, 'postfix' => '.', 'prefix' => '']
     *
     *  Example result for '1. Drittel 12. Jh.':
     *  ['number' => 12, 'postfix' => '. Jh.', 'prefix' => '1. Drittel ']
     *
     * @param string $date A string
     * @return array An array with the parsed number, prefix and postfix
     */
    static function stripLastNumber($date): array
    {

        // Approach the last number
        $postfix = '';
        $j = strlen($date) - 1;
        while (($j >= 0) and (!in_array($date[$j], self::TOKEN_DIGITS))) {
            $postfix = $date[$j] . $postfix;
            $j--;
        }

        // Extract last number
        $number = '';
        while (($j >= 0) and (in_array($date[$j], self::TOKEN_DIGITS))) {
            $number = $date[$j] . $number;
            $j--;
        }
        if ($number !== '') {
            $number = intval($number);
        }
        else {
            $number = null;
        }

        // The entire rest before the number
        $prefix = substr($date, 0, $j + 1);

        return ['prefix' => $prefix, 'number' => $number, 'postfix' => $postfix];
    }

    /**
     * Apply a delta to a DateTime object
     *
     * @param \DateTime $dateObj The date to modify
     * @param array $delta Delta as array with year, day, second keys (e.g., ['year' => 1, 'day' => 0, 'second' => -1])
     * @return \DateTime A new DateTime object with modifications applied
     */
    static function applyDateDelta(\DateTime $dateObj, array $delta): \DateTime
    {
        $result = clone $dateObj;

        if (isset($delta['year']) && $delta['year'] !== 0) {
            $result->modify($delta['year'] . ' years');
        }
        if (isset($delta['day']) && $delta['day'] !== 0) {
            $result->modify($delta['day'] . ' days');
        }
        if (isset($delta['second']) && $delta['second'] !== 0) {
            $result->modify($delta['second'] . ' seconds');
        }

        return $result;
    }


    /**
     * Validate the date component based on plausibility checks
     *
     * This encapsulates the validation logic that was previously in parseHistoricDate().
     *
     * @return void Modifies the invalid flag if validation fails
     */
    public function validate(): void
    {
        // Check for number presence
        if ($this->number === null) {
            $this->invalid = true;
            return;
        }

        // Validate unit+modifier combinations
        if ($this->unit === self::UNIT_YEAR) {
            if ($this->modifier !== '' &&
                $this->modifier !== self::MODIFIER_AROUND &&
                $this->modifier !== self::MODIFIER_BEFORE &&
                $this->modifier !== self::MODIFIER_AFTER &&
                $this->modifier !== self::MODIFIER_EARLIER &&
                $this->modifier !== self::MODIFIER_LATER) {
                $this->invalid = true;
            }
        }

        if ($this->unit === self::UNIT_CENTURY) {
            if ($this->modifier !== '' &&
                $this->modifier !== self::MODIFIER_BEGIN &&
                $this->modifier !== self::MODIFIER_MID &&
                $this->modifier !== self::MODIFIER_END &&
                $this->modifier !== self::MODIFIER_PART) {
                $this->invalid = true;
            }
        }

        // Validate fraction ranges
        if ($this->modifier === self::MODIFIER_PART) {
            if ($this->fraction['numerator_from'] > $this->fraction['denominator'] ||
                $this->fraction['numerator_from'] == 0 ||
                !in_array($this->fraction['denominator'], array_values(self::TOKEN_FRACTIONS))) {
                $this->invalid = true;
            }
        }
    }

    /**
     * Check if this is a century date
     *
     * @return bool
     */
    public function isCentury(): bool
    {
        return $this->unit === self::UNIT_CENTURY;
    }

    /**
     * Check if this is a year date
     *
     * @return bool
     */
    public function isYear(): bool
    {
        return $this->unit === self::UNIT_YEAR;
    }

    /**
     * Check if this is a day date
     *
     * @return bool
     */
    public function isDay(): bool
    {
        return $this->unit === self::UNIT_DAY;
    }

    /**
     * Check if this is an hour date
     *
     * @return bool
     */
    public function isHour(): bool
    {
        return $this->unit === self::UNIT_HOUR;
    }

    /**
     * Check if this is a minute date
     *
     * @return bool
     */
    public function isMinute(): bool
    {
        return $this->unit === self::UNIT_MINUTE;
    }

    /**
     * Check if this is a second date
     *
     * @return bool
     */
    public function isSecond(): bool
    {
        return $this->unit === self::UNIT_SECOND;
    }

    /**
     * Check if this date is before Christ
     *
     * @return bool
     */
    public function isNegative(): bool
    {
        return $this->negative;
    }

    /**
     * Check if this date component is invalid
     *
     * @return bool
     */
    public function isInvalid(): bool
    {
        return $this->invalid;
    }

    /**
     * Check if this date has a modifier
     *
     * @return bool
     */
    public function hasModifier(): bool
    {
        return $this->modifier !== '';
    }

    /**
     * Check if this date has a fraction
     *
     * @return bool
     */
    public function hasFraction(): bool
    {
        return $this->fraction['numerator_from'] !== null ||
               $this->fraction['numerator_to'] !== null ||
               $this->fraction['denominator'] !== null;
    }

    /**
     * Get the numeric value
     *
     * @return int|null
     */
    public function getNumber(): ?int
    {
        return $this->number;
    }

    /**
     * Set the numeric value
     *
     * @param int|null $number
     * @return static
     */
    public function setNumber(?int $number): static
    {
        $this->number = $number;
        return $this;
    }

    /**
     * Get the unit
     *
     * @return string
     */
    public function getUnit(): string
    {
        return $this->unit;
    }

    /**
     * Set the unit
     *
     * @param string $unit
     * @return static
     */
    public function setUnit(string $unit): static
    {
        $this->unit = $unit;
        return $this;
    }

    /**
     * Get the modifier
     *
     * @return string
     */
    public function getModifier(): string
    {
        return $this->modifier;
    }

    /**
     * Set the modifier
     *
     * @param string $modifier
     * @return static
     */
    public function setModifier(string $modifier): static
    {
        $this->modifier = $modifier;
        return $this;
    }

    /**
     * Get the day component
     *
     * @return array
     */
    public function getDay(): array
    {
        return $this->day;
    }

    /**
     * Get the hour component
     *
     * @return array
     */
    public function getHour(): array
    {
        return $this->hour;
    }

    /**
     * Get the fraction component
     *
     * @return array
     */
    public function getFraction(): array
    {
        return $this->fraction;
    }

    /**
     * Reset to empty state
     *
     * @return static
     */
    public function toArray(): array
    {
        return [
            'number' => $this->number,
            'unit' => $this->unit,
            'day' => $this->day,
            'hour' => $this->hour,
            'fraction' => $this->fraction,
            'negative' => $this->negative,
            'modifier' => $this->modifier,
            'short' => $this->short,
            'invalid' => $this->invalid,
            'isiso' => $this->isiso
        ];
    }

    /**
     * Convert a DateComponent to a normalized human-readable string representation.
     *
     * @param bool $short Use abbreviated century notation (e.g., "15." instead of "15. Jh.")
     * @return string Normalized date string, or empty string if date is invalid
     */
    public function normalizedString(bool $short = false): string
    {
        $out = '';

        if ($this->invalid) {
            return $out;
        }

        if ($this->isiso) {
            $month = $this->day['month'] !== null ? $this->day['month'] : 1;
            $day   = $this->day['day']   !== null ? $this->day['day']   : 1;
            $out  .= ($this->negative ? '-' : '')
                . sprintf('%04d-%02d-%02d', $this->number, $month, $day);

            if ($this->hour['hour'] !== null) {
                $out .= 'T' . sprintf('%02d', $this->hour['hour']);
                if ($this->hour['minute'] !== null) {
                    $out .= ':' . sprintf('%02d', $this->hour['minute']);
                    if ($this->hour['second'] !== null) {
                        $sec  = (int) floor($this->hour['second']);
                        $frac = (int) round(fmod($this->hour['second'], 1) * 1000);
                        $out .= ':' . sprintf('%02d', $sec);
                        if ($frac > 0) {
                            $out .= '.' . sprintf('%03d', $frac);
                        }
                    }
                }
            }
            return $out;
        }

        $space = ' '; // add space after abbreviation point?

        // Prefix
        switch ($this->modifier) {
            case self::MODIFIER_BEGIN:
                $out .= 'A.' . $space;
                break;
            case self::MODIFIER_MID:
                $out .= 'M.' . $space;
                break;
            case self::MODIFIER_END:
                $out .= 'E.' . $space;
                break;
            case self::MODIFIER_AROUND:
                $out .= 'um ';
                break;
            case self::MODIFIER_BEFORE:
                $out .= 'vor ';
                break;
            case self::MODIFIER_AFTER:
                $out .= 'nach ';
                break;
            default:
                if ($this->modifier == self::MODIFIER_PART) {
                    $out .= $this->fraction['numerator_from'] . '.';

                    if ($this->fraction['numerator_to'] !== null) {
                        $out .= "\u{2013}" . $this->fraction['numerator_to'] . '.';
                    }

                    if ($this->fraction['denominator'] == 2) {
                        $out .= ' H.' . $space;
                    }
                    elseif ($this->fraction['denominator'] == 3) {
                        $out .= ' D.' . $space;
                    }
                    elseif ($this->fraction['denominator'] == 4) {
                        $out .= ' V.' . $space;
                    }
                    elseif ($this->fraction['denominator'] == 10) {
                        $out .= ' Jz.' . $space;
                    }
                }
        }

        if ($this->day['month'] !== null) {
            $out .= str_pad($this->day['month'], 2, '0', STR_PAD_LEFT) . '-';
            if ($this->day['day'] !== null) {
                $out = str_pad($this->day['day'], 2, '0', STR_PAD_LEFT) . '-' . $out;
            }
        }
        $out .= $this->number;

        if (($this->unit === self::UNIT_CENTURY) and (!$short)) {
            $out .= '. Jh.';
        }
        elseif ($this->unit === self::UNIT_CENTURY) {
            $out .= '.';
        }

        // Before or after Christ
        if ($this->negative) {
            $out .= ' v. Chr.';
        }

        if ($this->modifier === self::MODIFIER_EARLIER) {
            $out .= ' o. früher';
        }

        if ($this->modifier === self::MODIFIER_LATER) {
            $out .= ' o. später';
        }

        return $out;
    }

    /**
     * Compute a list of reference points for a single historic date
     *
     * @return array of DateTime objects
     */
    public function refPoints(): array
    {
        if ($this->refPoints !== []) {
            return $this->refPoints;
        }
        $deltaDate = []; // deltas of the reference points with respect to the base year
        $sign = $this->negative ? -1 : +1;

        // compute reference points relative to $dateObj
        $keyElements = [];
        // === ISO date format
        if (in_array($this->unit, [self::UNIT_DAY, self::UNIT_MINUTE, self::UNIT_SECOND])) {
            $deltaDate = self::DELTA_DATE['plain_day'];
            $baseYear = $sign * intval($this->number);
        }
        elseif ($this->unit == self::UNIT_YEAR) {
            $type = $this->modifier == "" ? 'plain_year' : $this->modifier;
            $deltaDate = self::DELTA_DATE[$type];
            $baseYear = $sign * intval($this->number);
            // ISO has a year 0
            if ($baseYear < 0) {
                $baseYear += 1;
            }
        }
        elseif ($this->unit == self::UNIT_CENTURY) {
            // shift by -100 if date is positive
            $baseYear = $sign * intval($this->number) * 100 - ($sign + 1) * 50;

            if ($this->modifier === self::MODIFIER_PART) {
                $frac = intdiv(100, intval($this->fraction['denominator']));
                $numerator = intval($this->fraction['numerator_from']);
                $adjustThird = 0;
                if ($this->fraction['denominator'] == '3') {
                    $frac += 1;
                    // avoid accumulation because of extended interval
                    $adjustThird = 1 - $numerator;
                }
                $r2 = 1 + ($numerator - 1) * $frac + $adjustThird;
                $r3 = 1 + $numerator * $frac + $adjustThird;
                if ($this->fraction['numerator_to'] !== null) {
                    $numerator = $this->fraction['numerator_to'];
                    $adjustThird = $this->fraction['denominator'] == '3' ? 1 - $numerator : 0;
                    $r3 = 1 + $numerator * $frac + $adjustThird;
                }
                $deltaDate = [
                    "r1" => ['year' => $r3, 'second' => -1],
                    "r2" => ['year' => $r2],
                    "r3" => ['year' => $r3, 'second' => -1]
                ];
            }
            elseif ($this->modifier != "") {
                $deltaDate = self::DELTA_DATE[$this->modifier];
            }
            else {
                $deltaDate = self::DELTA_DATE['plain_century'];
            }
        }

        $refPoints = [];
        $dateObjMonth = $this->day['month'] ? intval($this->day['month']) : 1;
        $dateObjDay = $this->day['day'] ? intval($this->day['day']) : 1;
        foreach ($deltaDate as $delta) {
            $dateObj = new \DateTime();
            $dateObj->setDate($baseYear, $dateObjMonth, $dateObjDay);
            $dateObj->setTime(0, 0, 0);
            $refPoints[] = self::applyDateDelta($dateObj, $delta);
        }

        return $this->refPoints = $refPoints;
    }

    /**
     * Create sort key components for a single historic date
     *
     * Shift date by 10000 years into the future. Thus, dates before Christ do not break the lexicographic
     * sorting.
     *
     * @param bool $uncertain
     * @param string $dateVersion
     * @return array of strings
     */
    public function keyElements(bool $uncertain, string $dateVersion): array
    {
        $dateRefPoints = $this->refPoints();

        $keyElements = array_map(function ($r) {
            // shift date values for negative dates to ensure correct sorting
            $r->modify("+1 10000 years");
            return str_pad($r->format(self::DATE_TIME_FORMAT), 20, '0', STR_PAD_LEFT);
        },
            $dateRefPoints
        );

        // Resolve the ambiguity for otherwise identical keys
        // The modifiers lower the priority in the order of appearance in this code block.
        $priority = 0x0000;
        if ($this->modifier === self::MODIFIER_END) {
            $priority = $priority | self::PRIORITY_END;
        }
        if ($this->modifier === self::MODIFIER_EARLIER) {
            $priority = $priority | self::PRIORITY_EARLIER;
        }
        if ($this->modifier === self::MODIFIER_AROUND) {
            $priority = $priority | self::PRIORITY_AROUND;
        }
        if ($uncertain) {
            $priority = $priority | self::PRIORITY_UNCERTAIN;
        }

        $keyElements[] = str_pad($priority, 2, "0", STR_PAD_LEFT);
        $keyElements[] = $dateVersion;
        return $keyElements;
    }

    /**
     * Get the first and the last year of the parsed date term
     *
     * @return array A list of two years, the beginning and the end
     */
    public function span(): array
    {

        $refPoints = $this->refPoints();
        return array_filter([
            $refPoints[1]->format('Y'),
            $refPoints[2]->format('Y')
        ],
            fn($year) => $year !== null
        );

    }




}
