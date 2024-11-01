import OAuth from 'oauth-1.0a';
import axios from 'axios';
import { Env } from '../types';
import Cryptojs from 'crypto-js';

const MAX_TWEET_LENGTH = 280;


export const postTweet = async (tweetContent: string, replyToTweetId: string | null, env: Env) => {

    console.log("I am in post Tween function now");

    const credentials = {
        apiKey: env.API_KEY,
        apiKeySecret: env.API_KEY_SECRET,
        accessToken: env.ACCESS_TOKEN,
        accessTokenSecret: env.ACCESS_TOKEN_SECRET
    };

    const oauth = new OAuth({
        consumer: {
            key: credentials.apiKey,
            secret: credentials.apiKeySecret
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return Cryptojs.enc.Base64.stringify(
                Cryptojs.HmacSHA1(base_string, key)
            );

        }
    });

    const tweetEndpoint = 'https://api.twitter.com/2/tweets';
    const requestData = {
        url: tweetEndpoint,
        method: 'POST'
    };


    const authHeader = oauth.toHeader(
        oauth.authorize(requestData, {
            key: credentials.accessToken,
            secret: credentials.accessTokenSecret
        })
    );

    const tweetParts: string[] = [];
    let currentTweet = '';



    for (const word of tweetContent.split(' ')) {
        const potentialTweet = currentTweet ? `${currentTweet} ${word}` : word;

        if (potentialTweet.length <= MAX_TWEET_LENGTH) {
            currentTweet = potentialTweet;
        } else {
            tweetParts.push(currentTweet.trim());
            currentTweet = word;
        }
    }


    if (currentTweet) {
        tweetParts.push(currentTweet.trim());
    }

    let previousTweetId: string | null = null;
    const tweetIds: string[] = [];

    for (const tweetText of tweetParts) {
        const payload: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
            text: tweetText
        };

        if (previousTweetId) {
            payload.reply = {
                in_reply_to_tweet_id: previousTweetId
            };
        }

        try {
            const response = await axios({
                url: tweetEndpoint,
                method: 'POST',
                headers: {
                    ...authHeader,
                    'Content-Type': 'application/json'
                },
                data: payload
            });

            console.log('Tweet posted successfully:', response);

            // Fetch the ID from the correct location in the response
            const newTweetId = response.data.data?.id || response.data.id;
            if (newTweetId) {
                tweetIds.push(newTweetId);
                previousTweetId = newTweetId;
            } else {
                console.error('Failed to retrieve tweet ID:', response.data);
                break; // Stop if we can't retrieve the tweet ID
            }
        } catch (error) {
            console.error('Error posting tweet part:', tweetText, error);
            break; // Optional: stop posting the thread if there's an error
        }
    }

    console.log("tweetIds", tweetIds);

    return { tweetIds };

}
