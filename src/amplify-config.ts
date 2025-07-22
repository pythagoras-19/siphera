import { Amplify } from 'aws-amplify';

// Amplify configuration for AWS Cognito
const awsconfig = {
  aws_project_region: 'us-east-1',
  aws_cognito_region: 'us-east-2',
  aws_user_pools_id: 'us-east-2_IMWZV35x8',
  aws_user_pools_web_client_id: '58a7ri4d4l90s00kfgs6vq6elq'
};

// Configure Amplify
Amplify.configure(awsconfig);

export default awsconfig; 