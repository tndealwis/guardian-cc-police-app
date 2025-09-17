# Guardian

Guardian is community policing application, essentially an online portal which enables reporting crimes and contacting your local force.

### Running the backend for development
```bash 
# Tested with following versions
# Python 3.11
# NodeJS 22.19.0
# Other possible requirements for Windows: Visual Studio Building Tools with C++ development kit module
# Note: This was developed on macOS, and i ran into windows incompatibilty issues when running on Windows for testing. One of the issues was fixed but the other requires executing one additonal command before running the project. Read below.

# 1. Clone the repo

# 2. cd into /backend

# 3. Install dependencies
    npm install

# 4. Set env variables by renaming the .env.example file to .env and replace necessary values such as mapbox public token key, chatbot json file location and chatbot project name

# 6. (For Windows) Run the following command in /backend which copies a tensorflow file to another destination which windows fail to do for some reason by its own

cp node_modules/\@tensorflow/tfjs-node/deps/lib/tensorflow.dll node_modules/\@tensorflow/tfjs-node/lib/napi-v8/

# 5. Train the model
npm run model:train

# Start the development server
npm run dev
```

You can then visit `localhost:2699/api-docs` and view all available endpoints
