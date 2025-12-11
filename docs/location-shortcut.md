# iOS Shortcut for Location Updates

Update your location from anywhere using an iOS Shortcut that commits directly to GitHub.

## Prerequisites

1. **GitHub Personal Access Token (PAT)**
   - Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
   - Click "Generate new token"
   - Name: `living-site-location`
   - Expiration: Choose what you're comfortable with
   - Repository access: Only select repositories → `living-site`
   - Permissions: Contents → Read and write
   - Generate and copy the token

## Creating the Shortcut

### Option A: Manual Location Entry

1. Open the **Shortcuts** app on iOS
2. Tap **+** to create a new shortcut
3. Add these actions in order:

#### Step 1: Ask for Location
- Add: **Ask for Input**
- Question: `Where are you?`
- Input Type: Text
- Default Answer: (leave empty)

#### Step 2: Get Current Time
- Add: **Date**
- Select: Current Date

#### Step 3: Format the Date
- Add: **Format Date**
- Date: (use Date from previous step)
- Format: Custom → `yyyy-MM-dd'T'HH:mm:ss'Z'`

#### Step 4: Build JSON
- Add: **Text**
- Content:
```
{
  "description": "[Ask for Input result]",
  "coordinates": {
    "lat": 59.3293,
    "lon": 18.0686
  },
  "updated_at": "[Formatted Date]"
}
```
(Replace the bracketed items with magic variables from previous steps)

#### Step 5: Get Current File SHA
- Add: **Get Contents of URL**
- URL: `https://api.github.com/repos/YOUR_USERNAME/living-site/contents/data/location.json`
- Method: GET
- Headers:
  - `Authorization`: `Bearer YOUR_PAT_HERE`
  - `Accept`: `application/vnd.github.v3+json`

#### Step 6: Get SHA from Response
- Add: **Get Dictionary Value**
- Key: `sha`
- Dictionary: (Contents of URL result)

#### Step 7: Encode JSON as Base64
- Add: **Base64 Encode**
- Input: (Text from Step 4)

#### Step 8: Build Commit Payload
- Add: **Text**
- Content:
```
{
  "message": "Update location",
  "content": "[Base64 Encoded result]",
  "sha": "[SHA from Step 6]"
}
```

#### Step 9: Commit to GitHub
- Add: **Get Contents of URL**
- URL: `https://api.github.com/repos/YOUR_USERNAME/living-site/contents/data/location.json`
- Method: PUT
- Headers:
  - `Authorization`: `Bearer YOUR_PAT_HERE`
  - `Content-Type`: `application/json`
- Request Body: (Text from Step 8)

#### Step 10: Show Confirmation
- Add: **Show Notification**
- Title: Location Updated
- Body: (Ask for Input result)

4. Name the shortcut: `Update Location`
5. Add to Home Screen or enable Siri

---

### Option B: With GPS Coordinates

For automatic coordinates, modify Step 4:

1. After "Ask for Input", add: **Get Current Location**
2. Then add: **Get Details of Location** → Get Latitude
3. Add another: **Get Details of Location** → Get Longitude
4. Update the JSON in Step 4:
```
{
  "description": "[Ask for Input result]",
  "coordinates": {
    "lat": [Latitude],
    "lon": [Longitude]
  },
  "updated_at": "[Formatted Date]"
}
```

---

## Usage

- Tap the shortcut or say "Hey Siri, update location"
- Enter a description like "Starbucks in Södermalm, Stockholm"
- The shortcut commits to your repo
- Next site regeneration will include the new location and weather

## Security Notes

- Your PAT is stored encrypted on-device in the Shortcut
- Use a fine-grained token scoped only to this repo
- The token only has Contents write permission
- For extra security, store the PAT in Keychain and use "Get Password from Keychain" action

## Troubleshooting

**"Not Found" error**: Check the repo name and username in the URL

**"Bad credentials"**: Regenerate your PAT and update the Shortcut

**"SHA mismatch"**: Someone else updated the file. Run the shortcut again.

## Alternative: Share Sheet

You can also create a shortcut that accepts shared locations from Maps:

1. Add "Receive Input from Share Sheet" at the start
2. Filter for Maps/Locations
3. Extract the place name and coordinates automatically
