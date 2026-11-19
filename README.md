# Date values

The classes in this repository convert natural-language dates into a structured
format and generate a sort key that serves as the basis for chronological
sorting. The code is available for the programming languages PHP, JS, and Python
(coming soon). See below for implementation details.

Dates must be entered according to the defined patterns shown in the examples below.
When entering a date, Epigraf parses and normalizes upper and lower case, spaces and selected abbreviations.
Dates can be entered as individual dates (e.g., 1520) or as date ranges (e.g., 1520–1522).
Multiple dates are separated by a comma (e.g., 1520, 1522) or by 'oder' (e.g., 1524 oder 1525).

A range consisting of the start and end years is derived from the most recent and oldest single dates.
This range is used for search functions.

To enable chronological sorting, each date is assigned a sort key. There are two principles that guide chronological sorting:
First, date ranges extending further back in time appear before those extending less far back.
Second, date ranges extending further into the future appear after those that do not extend as far.
Therefore, a potentially older date is sorted before a potentially younger date, and vice versa.

The sort key has five parts:
1. A reference date, which is usually the end of the year mentioned in the natural language date description.
2. The start of the date range.
3. The end of the date range.
4. A priority key based on date modifiers such as "um", "nach", "Anfang", and "Ende."
5. The version number of the dating scheme.

Parts 1–3 are shifted 10,000 years into the future so that dates before Christ do not disrupt lexicographic sorting.

The table contains examples of date entries, along with the time period assigned in Epigraf and the sort key.

<figure class="table">
<table>
  <thead>
    <tr>
      <th>Order</th>
      <th>Date</th>
      <th>Normalized date</th>
      <th>Start year</th>
      <th>End year</th>
      <th>Sortkey</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>vor 500 v.Chr.</td>
      <td>vor 500 v. Chr.</td>
      <td>-508</td>
      <td>-499</td>
      <td>09501-01-01T00:00:00/09492-01-01T00:00:00/09501-01-01T00:00:00/00/5</td>
    </tr>
    <tr>
      <td>2</td>
      <td>A.5.Jh.v.Chr.</td>
      <td>A. 5. Jh. v. Chr.</td>
      <td>-499</td>
      <td>-491</td>
      <td>09501-01-01T00:00:00/09501-01-01T00:00:00/09509-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>3</td>
      <td>499 v.Chr. o. früher</td>
      <td>499 v. Chr. o. früher</td>
      <td>-506</td>
      <td>-498</td>
      <td>09502-12-31T23:59:59/09494-01-01T00:00:00/09502-12-31T23:59:59/02/5</td>
    </tr>
    <tr>
      <td>4</td>
      <td>um 8 v. Chr.</td>
      <td>um 8 v. Chr.</td>
      <td>-15</td>
      <td>2</td>
      <td>09993-12-31T23:59:59/09985-01-01T00:00:00/10002-12-31T23:59:59/02/5</td>
    </tr>
    <tr>
      <td>5</td>
      <td>3 v.Chr.</td>
      <td>3 v. Chr.</td>
      <td>-2</td>
      <td>-2</td>
      <td>09998-12-31T23:59:59/09998-01-01T00:00:00/09998-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>6</td>
      <td>1200 v. Chr. - 1. Jh. v.Chr.</td>
      <td>1200 v. Chr.–1. Jh. v. Chr.</td>
      <td>-1199</td>
      <td>0</td>
      <td>10000-12-31T23:59:59/08801-01-01T00:00:00/10000-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>7</td>
      <td>3 n. Chr.</td>
      <td>3</td>
      <td>3</td>
      <td>3</td>
      <td>10003-12-31T23:59:59/10003-01-01T00:00:00/10003-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>8</td>
      <td>vor 5</td>
      <td>vor 5</td>
      <td>-4</td>
      <td>5</td>
      <td>10005-01-01T00:00:00/09996-01-01T00:00:00/10005-01-01T00:00:00/00/5</td>
    </tr>
    <tr>
      <td>9</td>
      <td>vor 1200</td>
      <td>vor 1200</td>
      <td>1191</td>
      <td>1200</td>
      <td>11200-01-01T00:00:00/11191-01-01T00:00:00/11200-01-01T00:00:00/00/5</td>
    </tr>
    <tr>
      <td>10</td>
      <td>um 1200</td>
      <td>um 1200</td>
      <td>1192</td>
      <td>1209</td>
      <td>11200-12-31T23:59:59/11192-01-01T00:00:00/11209-12-31T23:59:59/02/5</td>
    </tr>
    <tr>
      <td>11</td>
      <td>1200</td>
      <td>1200</td>
      <td>1200</td>
      <td>1200</td>
      <td>11200-12-31T23:59:59/11200-01-01T00:00:00/11200-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>12</td>
      <td>nach 1200</td>
      <td>nach 1200</td>
      <td>1200</td>
      <td>1209</td>
      <td>11200-12-31T23:59:59/11200-12-31T23:59:59/11209-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>13</td>
      <td>um 1270–80</td>
      <td>um 1270–1280</td>
      <td>1262</td>
      <td>1280</td>
      <td>11280-12-31T23:59:59/11262-01-01T00:00:00/11280-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>14</td>
      <td>A.14.Jh.</td>
      <td>A. 14. Jh.</td>
      <td>1301</td>
      <td>1309</td>
      <td>11301-01-01T00:00:00/11301-01-01T00:00:00/11309-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>15</td>
      <td>1399</td>
      <td>1399</td>
      <td>1399</td>
      <td>1399</td>
      <td>11399-12-31T23:59:59/11399-01-01T00:00:00/11399-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>16</td>
      <td>nach 1399</td>
      <td>nach 1399</td>
      <td>1399</td>
      <td>1408</td>
      <td>11399-12-31T23:59:59/11399-12-31T23:59:59/11408-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>17</td>
      <td>vor 1400</td>
      <td>vor 1400</td>
      <td>1391</td>
      <td>1400</td>
      <td>11400-01-01T00:00:00/11391-01-01T00:00:00/11400-01-01T00:00:00/00/5</td>
    </tr>
    <tr>
      <td>18</td>
      <td>14.Jh.</td>
      <td>14. Jh.</td>
      <td>1301</td>
      <td>1400</td>
      <td>11400-12-31T23:59:59/11301-01-01T00:00:00/11400-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>19</td>
      <td>Ende 14.Jh.</td>
      <td>E. 14. Jh.</td>
      <td>1392</td>
      <td>1400</td>
      <td>11400-12-31T23:59:59/11392-01-01T00:00:00/11400-12-31T23:59:59/01/5</td>
    </tr>
    <tr>
      <td>20</td>
      <td>1400 o. früher</td>
      <td>1400 o. früher</td>
      <td>1392</td>
      <td>1400</td>
      <td>11400-12-31T23:59:59/11392-01-01T00:00:00/11400-12-31T23:59:59/02/5</td>
    </tr>
    <tr>
      <td>21</td>
      <td>um 1400</td>
      <td>um 1400</td>
      <td>1392</td>
      <td>1409</td>
      <td>11400-12-31T23:59:59/11392-01-01T00:00:00/11409-12-31T23:59:59/02/5</td>
    </tr>
    <tr>
      <td>22</td>
      <td>1400</td>
      <td>1400</td>
      <td>1400</td>
      <td>1400</td>
      <td>11400-12-31T23:59:59/11400-01-01T00:00:00/11400-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>23</td>
      <td>1400 o. später</td>
      <td>1400 o. später</td>
      <td>1400</td>
      <td>1409</td>
      <td>11400-12-31T23:59:59/11400-01-01T00:00:00/11409-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>24</td>
      <td>nach 1400</td>
      <td>nach 1400</td>
      <td>1400</td>
      <td>1409</td>
      <td>11400-12-31T23:59:59/11400-12-31T23:59:59/11409-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>25</td>
      <td>A.15.Jh.</td>
      <td>A. 15. Jh.</td>
      <td>1401</td>
      <td>1409</td>
      <td>11401-01-01T00:00:00/11401-01-01T00:00:00/11409-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>26</td>
      <td>1401</td>
      <td>1401</td>
      <td>1401</td>
      <td>1401</td>
      <td>11401-12-31T23:59:59/11401-01-01T00:00:00/11401-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>27</td>
      <td>1.Jz.15.Jh.</td>
      <td>1. Jz. 15. Jh.</td>
      <td>1401</td>
      <td>1410</td>
      <td>11410-12-31T23:59:59/11401-01-01T00:00:00/11410-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>28</td>
      <td>1412</td>
      <td>1412</td>
      <td>1412</td>
      <td>1412</td>
      <td>11412-12-31T23:59:59/11412-01-01T00:00:00/11412-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>29</td>
      <td>1410-1413</td>
      <td>1410–1413</td>
      <td>1410</td>
      <td>1413</td>
      <td>11413-12-31T23:59:59/11410-01-01T00:00:00/11413-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>30</td>
      <td>1410 bis 1414</td>
      <td>1410–1414</td>
      <td>1410</td>
      <td>1414</td>
      <td>11414-12-31T23:59:59/11410-01-01T00:00:00/11414-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>31</td>
      <td>1410-15</td>
      <td>1410–1415</td>
      <td>1410</td>
      <td>1415</td>
      <td>11415-12-31T23:59:59/11410-01-01T00:00:00/11415-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>32</td>
      <td>2.Jz.15.Jh.</td>
      <td>2. Jz. 15. Jh.</td>
      <td>1411</td>
      <td>1420</td>
      <td>11420-12-31T23:59:59/11411-01-01T00:00:00/11420-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>33</td>
      <td>1.V.15.Jh.</td>
      <td>1. V. 15. Jh.</td>
      <td>1401</td>
      <td>1425</td>
      <td>11425-12-31T23:59:59/11401-01-01T00:00:00/11425-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>34</td>
      <td>1425</td>
      <td>1425</td>
      <td>1425</td>
      <td>1425</td>
      <td>11425-12-31T23:59:59/11425-01-01T00:00:00/11425-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>35</td>
      <td>M.14.-M.15.Jh.</td>
      <td>M. 14.–M. 15. Jh.</td>
      <td>1342</td>
      <td>1459</td>
      <td>11450-12-31T23:59:59/11342-01-01T00:00:00/11459-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>36</td>
      <td>1.H.15.Jh.</td>
      <td>1. H. 15. Jh.</td>
      <td>1401</td>
      <td>1450</td>
      <td>11450-12-31T23:59:59/11401-01-01T00:00:00/11450-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>37</td>
      <td>2.D.15.Jh.</td>
      <td>2. D. 15. Jh.</td>
      <td>1434</td>
      <td>1467</td>
      <td>11467-12-31T23:59:59/11434-01-01T00:00:00/11467-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>38</td>
      <td>2.-3.V.15.Jh.</td>
      <td>2.–3. V. 15. Jh.</td>
      <td>1426</td>
      <td>1475</td>
      <td>11475-12-31T23:59:59/11426-01-01T00:00:00/11475-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>39</td>
      <td>1499 o. früher</td>
      <td>1499 o. früher</td>
      <td>1491</td>
      <td>1499</td>
      <td>11499-12-31T23:59:59/11491-01-01T00:00:00/11499-12-31T23:59:59/02/5</td>
    </tr>
    <tr>
      <td>40</td>
      <td>1410 - Anfang 16.Jh</td>
      <td>1410–A. 16. Jh.</td>
      <td>1410</td>
      <td>1509</td>
      <td>11501-01-01T00:00:00/11410-01-01T00:00:00/11509-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>41</td>
      <td>E.15.Jh. - A.16.Jh.</td>
      <td>E. 15.–A. 16. Jh.</td>
      <td>1492</td>
      <td>1509</td>
      <td>11501-01-01T00:00:00/11492-01-01T00:00:00/11509-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>42</td>
      <td>1504, 1525</td>
      <td>1504 und 1525</td>
      <td>1504</td>
      <td>1525</td>
      <td>11504-12-31T23:59:59/11504-01-01T00:00:00/11525-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>43</td>
      <td>1520, 1525 und 1504</td>
      <td>1520, 1525, 1504</td>
      <td>1504</td>
      <td>1525</td>
      <td>11520-12-31T23:59:59/11504-01-01T00:00:00/11525-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>44</td>
      <td>1520</td>
      <td>1520</td>
      <td>1520</td>
      <td>1520</td>
      <td>11520-12-31T23:59:59/11520-01-01T00:00:00/11520-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>45</td>
      <td>1520 ?</td>
      <td>1520?</td>
      <td>1520</td>
      <td>1520</td>
      <td>11520-12-31T23:59:59/11520-01-01T00:00:00/11520-12-31T23:59:59/04/5</td>
    </tr>
    <tr>
      <td>46</td>
      <td>1520 – 1522</td>
      <td>1520–1522</td>
      <td>1520</td>
      <td>1522</td>
      <td>11522-12-31T23:59:59/11520-01-01T00:00:00/11522-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>47</td>
      <td>1524 oder 1525</td>
      <td>1524 oder 1525</td>
      <td>1524</td>
      <td>1525</td>
      <td>11524-12-31T23:59:59/11524-01-01T00:00:00/11525-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>48</td>
      <td>Mitte 16. Jh</td>
      <td>M. 16. Jh.</td>
      <td>1542</td>
      <td>1559</td>
      <td>11550-12-31T23:59:59/11542-01-01T00:00:00/11559-12-31T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>49</td>
      <td>19460319</td>
      <td>1946-03-19</td>
      <td>1946</td>
      <td>1946</td>
      <td>11946-03-19T23:59:59/11946-03-19T00:00:00/11946-03-19T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>50</td>
      <td>19460319/19460320</td>
      <td>1946-03-19/1946-03-20</td>
      <td>1946</td>
      <td>1946</td>
      <td>11946-03-20T23:59:59/11946-03-19T00:00:00/11946-03-20T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>51</td>
      <td>1946-03-24 bis 1946-03-25</td>
      <td>1946-03-24/1946-03-25</td>
      <td>1946</td>
      <td>1946</td>
      <td>11946-03-25T23:59:59/11946-03-24T00:00:00/11946-03-25T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>52</td>
      <td>1946-03-20/1961-04-12</td>
      <td>1946-03-20/1961-04-12</td>
      <td>1946</td>
      <td>1961</td>
      <td>11961-04-12T23:59:59/11946-03-20T00:00:00/11961-04-12T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>53</td>
      <td>1961-04-12T13:14</td>
      <td>1961-04-12T13:14</td>
      <td>1961</td>
      <td>1961</td>
      <td>11961-04-12T23:59:59/11961-04-12T00:00:00/11961-04-12T23:59:59/00/5</td>
    </tr>
    <tr>
      <td>54</td>
      <td>1961-04-13T13:14:22</td>
      <td>1961-04-13T13:14:22</td>
      <td>1961</td>
      <td>1961</td>
      <td>11961-04-13T23:59:59/11961-04-13T00:00:00/11961-04-13T23:59:59/00/5</td>
    </tr>
  </tbody>
</table>
</figure>

## Implementation details for PHP and JavaScript
A procedural version is located in the 'functional' directory. HistoricDates is a single class with static methods that uses array structures to represent dates. EMPTY_DATE is a template container for date components and EMPTY_DATE_ARRAY is a template container for date ranges. The key methods are normalize(), encode(), parseHistoricDateList(), and parseHistoricDateRange().

A more object-oriented version is located in the "src" directory. The DateComponent and DateRange classes replace the EMPTY_DATE and EMPTY_DATE_ARRAY associative arrays from the functional version. These classes encapsulate date component and range logic in typed class structures. While the functional version stores data in plain arrays, these classes provide type safety through PHP type hints, method-based operations, and proper encapsulation.