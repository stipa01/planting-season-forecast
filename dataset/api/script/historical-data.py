# Importation of dependencies
import time
import openmeteo_requests

import requests_cache
import pandas as pd
from retry_requests import retry

df_districts = pd.read_csv("../data/RwandaDistrictCentroidsLongitude_Latitude.csv")

districts = dict()
for i in range(len(df_districts)):
    districts[df_districts.loc[i, "District"]] = {
        'province': df_districts.loc[i, "Province"],
        'lat':  -df_districts.loc[i, "Latitude"],
        'long': df_districts.loc[i, "Longitude"]
    }

district_names = ['Gatsibo', 'Muhanga', 'Gicumbi', 'Kicukiro', 'Rulindo', 'Nyaruguru',
       'Rwamagana', 'Kamonyi', 'Gasabo', 'Ngororero', 'Rubavu', 'Nyamagabe',
       'Burera', 'Nyabihu', 'Gakenke', 'Nyamasheke', 'Kirehe', 'Nyagatare',
       'Bugesera', 'Karongi', 'Huye', 'Musanze', 'Rusizi', 'Ngoma',
       'Nyarugenge', 'Gisagara', 'Kayonza', 'Ruhango', 'Nyanza', 'Rutsiro']

# Set up the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)
url = "https://archive-api.open-meteo.com/v1/archive"

features = ["temperature_2m_max", "daylight_duration", "sunshine_duration", "precipitation_sum", "rain_sum",
            "wind_speed_10m_max", "wind_direction_10m_dominant", "shortwave_radiation_sum"]

for feature in features:
    daily_data = dict()

    for district in districts:
        params = {
            "latitude": districts[district]['lat'],
            "longitude": districts[district]['long'],
            "start_date": "2008-01-01",  # Forecast Horizon Starts
            "end_date": "2023-12-31",  # Forecast Horizon Ends
            "daily": feature,
            "timezone": "auto"
        }
        responses = openmeteo.weather_api(url, params=params)

        # Process first location. Add a for-loop for multiple locations or weather models
        response = responses[0]
        daily = response.Daily()

        daily_data[district] = daily.Variables(0).ValuesAsNumpy()
        time.sleep(10)

    date = pd.date_range(
        start=pd.to_datetime(daily.Time(), unit="s", utc=True),
        end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=daily.Interval()),
        inclusive="left")

    data = pd.DataFrame(data=daily_data, index=date)

    data.to_csv(f'../data/{feature}.csv', index=False)