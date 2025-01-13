import './App.css';
import { useState } from 'react'
import { Button, Label, TextInput, FileInput } from "flowbite-react";
import { nanoid } from 'nanoid';
import axios from 'axios';

async function uploadFileToS3(params) {
  try {
    const { API_ENDPOINT, file } = params
    // Generate signed URL for uploading file to S3
    const response = await axios.get(`${API_ENDPOINT}uploadFile?fileName=${encodeURIComponent(file.name)}`);

    if (response.status !== 200) {
      throw new Error("Failed to get signed URL from API.");
    }

    const { uploadUrl, filePath } = response.data;

    // Upload file to S3
    const responseFromBucketInsertion = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!responseFromBucketInsertion.ok) {
      throw new Error(`Failed to upload file to S3. Status: ${responseFromBucketInsertion.statusText}`);
    }

    console.log("File uploaded successfully:", filePath);

    return {
      status: 200,
      filePath: filePath
    }
  } catch (error) {
    console.error("Error during file upload process:", error.message);
    return {
      status: 500,
      filePath: error.message
    }
  }
};


async function insertRecordToDynamoDB(params) {
  try {
    const { API_ENDPOINT, textInput, filePath } = params;

    const response = await axios.post(`${API_ENDPOINT}insertRecord`, {
      id: nanoid(),
      inputText: textInput,
      filePath: filePath
    });

    if (response.status !== 200) {
      throw new Error("Failed to insert record in DynamoDB");
    }

    return {
      status: 200,
      id: response.id,
      message: response.message
    }
  } catch (error) {
    console.error("Error during db insertion record process:", error.message);
    return {
      status: 500,
      message: error.message
    }
  }
};

function App() {
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState(null);

  function handleFileChange(event) {
    event.preventDefault();
    setFile(event.target.files[0]);
  };

  function handleTextInputChange(event) {
    event.preventDefault();
    setTextInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      console.log(textInput, file.name);

      const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

      if (!API_ENDPOINT) {
        throw new Error("API endpoint is not defined in the environment variables.");
      }

      const { status, filePath } = await uploadFileToS3({ API_ENDPOINT, file });

      if (status !== 200) {
        throw new Error(filePath);
      }

      // TODO: Add a record in DynamoDB corresponding to this input
      const response = await insertRecordToDynamoDB({ API_ENDPOINT, textInput, filePath });

      if (response.status !== 200) {
        throw new Error(response.message);
      }

    } catch (error) {
      console.error("Error during file upload process:", error.message);
    }
  };

  return (
    <div className='App'>
      <h1 className="mt-20 text-2xl font-bold leading-none tracking-tight text-black-900 md:text-3xl lg:text-4xl dark:text-white">Serverless File Storage Hub</h1>
      <div className="container form-container">
        <form className="flex grow flex-col gap-4 max-w-lg" onSubmit={handleSubmit}>
          <div className="text-left">
            <Label htmlFor="textInput" value="Text Input" />
          </div>
          <div className="flex w-full items-center justify-center">
            <TextInput id="textInput" type="text" placeholder="" required className='flex w-full' onChange={handleTextInputChange} />
          </div>
          <div className="text-left">
            <Label htmlFor="fileInput" value="File Input" />
          </div>
          <div className="flex w-full items-center justify-center">
            <FileInput id="fileInput" required className='flex w-full' onChange={handleFileChange} />
          </div>
          <Button type="submit" className='mt-4' color="dark">Submit</Button>
        </form>
      </div>
    </div>
  );
}

export default App;