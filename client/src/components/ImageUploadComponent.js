import React from 'react';
import Webcam from 'react-webcam';
import {
  Card,
  ImageUploadSection,
  UploadOptions,
  UploadButton,
  CameraButton,
  ButtonText,
  HiddenInput,
  WebcamContainer,
  CaptureButton,
  CloseButton,
  ImagePreview,
  PreviewImage,
  LoadingSpinner,
  ErrorMessage
} from '../styles/FormStyles';

/**
 * Image upload section component
 */
const ImageUploadComponent = ({
  showCamera,
  imagePreview,
  extracting,
  extractionError,
  webcamRef,
  handleFileChange,
  handleCameraToggle,
  handleCapture,
  handleRemoveImage
}) => (
  <Card>
    <ImageUploadSection>
      <h2>Upload Bill Image</h2>
      <p>Upload a photo of your bill to automatically extract information</p>
      
      {!showCamera && !imagePreview && (
        <UploadOptions>
          <UploadButton>
            <i className="fas fa-file-upload" style={{ fontSize: '2rem', color: '#7f8c8d' }}></i>
            <ButtonText>Upload Image</ButtonText>
            <HiddenInput 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </UploadButton>
          
          <CameraButton onClick={handleCameraToggle}>
            <i className="fas fa-camera" style={{ fontSize: '2rem', color: '#7f8c8d' }}></i>
            <ButtonText>Take Photo</ButtonText>
          </CameraButton>
        </UploadOptions>
      )}
      
      {showCamera && (
        <WebcamContainer>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width="100%"
            videoConstraints={{
              facingMode: "environment"
            }}
          />
          <CaptureButton onClick={handleCapture}>
            <i className="fas fa-camera"></i>
          </CaptureButton>
          <CloseButton onClick={handleCameraToggle}>Cancel</CloseButton>
        </WebcamContainer>
      )}
      
      {imagePreview && (
        <ImagePreview>
          <PreviewImage src={imagePreview} alt="Bill preview" />
          <CloseButton onClick={handleRemoveImage}>
            Remove Image
          </CloseButton>
        </ImagePreview>
      )}
      
      {extracting && <LoadingSpinner />}
      
      {extractionError && (
        <ErrorMessage>{extractionError}</ErrorMessage>
      )}
    </ImageUploadSection>
  </Card>
);

export default ImageUploadComponent; 