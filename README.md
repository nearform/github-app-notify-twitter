# github-app-notify-twitter

[![ci](https://github.com/nearform/github-app-notify-twitter/actions/workflows/ci.yml/badge.svg)](https://github.com/nearform/github-app-notify-twitter/actions/workflows/ci.yml)
[![cd](https://github.com/nearform/github-app-notify-twitter/actions/workflows/cd.yml/badge.svg)](https://github.com/nearform/github-app-notify-twitter/actions/workflows/cd.yml)

A Fastify application that can send messages to Twitter on release events on repositories.

## Usage

- Deploy the application with the right Twitter credentials. When deploying make sure that the Twitter api and access keys are set up, as an environmental variables, with the following names:
    - TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN & TWITTER_ACCESS_TOKEN_SECRET - The values for them can be obtained from the Twitter Developer Portal of your Twitter account
- Create a new GitHub App on the repositories or the organization where you want to use this application. In order to set it up correctly, github app has to have the following:
    - Repository permissions: **Contents** and **Metadata** set to _**READ-ONLY**_ access level
    - Should subscribe to **Release** events
    - Activated **Webhooks** with **Webhook URL** pointing to the URL where this Fastify application is deployed (e.g. GCP) - make sure that you add **_/release_** to the URL, The webhook URL should look something like this: _**https://<YOUR_GCP_URL>/release**_
    - Once the GitHub App is created, configure the repository access (can be All or selected individually) 
- When setting up your Twitter account, to recieve the tweets from this application, make sure you enable **OAuth 1.0a** and set the permission level to **Read & Write** (if you generated the Access token & secret before you've updated this setting - you have to regenerate them to have the correct permission level to post tweets)
## How it works

- The GitHub app (that is added to the organization) will listen to the "Release" events and send them to the Webhook URL
- Once the deployed Fastify app recieves a "Release" event the application will check:
    - if all the neccessary Twitter tokens are present
    - check if the repository is public (currently the tweets will be sent only for public repositories)
    - check if the Release is in status "published"
- Once all of the conditions mentioned above are met, the app will then post a message to Twitter. The message will have the following format:
    - `[REPOSITORY_NAME] [RELEASE_TAG] has been released. Check out the release notes: [RELEASE_HTML_URL]` 
    - Example: "_github-app-notify-twitter 1.0.0  has been released. Check out the release notes: https://github.com/radomird/github-app-notify-twitter/releases/tag/1.0.0_"

## How to deploy this app to GCP

- Prerequisites: a GCP project with the [cloud run and cloud build apis enabled](https://cloud.google.com/apis/docs/getting-started)
- Create a service account in the IAM & Admin console to be used to deploy the app
- Create a key for the service account, this key will be configured as a secret in the GitHub actions to be able to deploy the app
- Grant following [permissions](https://github.com/google-github-actions/deploy-cloudrun) for the service account
  - Artifact Registry Administrator
  - Cloud Build Service Account
  - Service Account User
  - Cloud Run Admin
  - Cloud Run Service Agent
  - Storage Admin
- Clone this repo to your GitHub account
- In the `Settings` of your GitHub repo, go to `Secrets` and create the `New repository secret` with the names and values below:
    - `GCP_PROJECT_ID`: The [ID](https://support.google.com/googleapi/answer/7014113?hl=en) of the GCP project as found in your GCP Account
    - `GCP_CLOUDRUN_SERVICE_NAME`: The name of the cloud run service, you can select any name that you prefer
    - `GCP_CLOUDRUN_SERVICE_REGION`: The [region](https://cloud.google.com/compute/docs/regions-zones) in the GCP that you want to create the cloud run service
    - `GCP_SA_KEY`: The key that you created for your service account with the permissions to deploy the app. This is a JSON object and should be used as-is.
    - `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN` & `TWITTER_ACCESS_TOKEN_SECRET`: Twitter keys for your Twitter account you want to post the tweets to (can be obtained from the Twitter Developer Portal)
- After the steps above are configured, go to `Actions` in your GitHub repo and run the CD workflow that is created in the folder `.github/workflows/cd.yaml`. The file is already configured with the action to deploy the cloud run service using the secrets that were created in the step above.
- Once the workflow run, go to you GCP Account and open the "Cloud Run" page to see the details of the deployed service.