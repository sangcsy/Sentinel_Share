'use strict';

const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

// In ECS/Fargate the SDK automatically uses the task IAM role.
// Locally, set AWS_ENDPOINT_URL=http://localhost:4566 to route to LocalStack.
const s3Client = new S3Client({
  region: env.AWS_REGION,
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true, // required for LocalStack path-style bucket access
  }),
});

module.exports = { s3Client };
