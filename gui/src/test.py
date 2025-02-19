import asyncio
import websockets
import sys
import pathlib

async def send_wav_file(websocket, wav_path):
    # Read the WAV file in binary mode
    with open(wav_path, 'rb') as f:
        wav_data = f.read()
    
    print(f"Sending WAV file: {wav_path}")
    print(f"File size: {len(wav_data)} bytes")
    
    # Send the binary data
    await websocket.send(wav_data)
    
    # Wait for and print responses
    while True:
        try:
            response = await websocket.recv()
            print("Received:", response)
            
            # If we got the AI response (after transcription), we can stop
            if not response.startswith("Transcription:"):
                break
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")
            break

async def main():
    if len(sys.argv) != 2:
        print("Usage: python script.py <path_to_wav_file>")
        return
        
    wav_path = pathlib.Path(sys.argv[1])
    if not wav_path.exists():
        print(f"Error: File {wav_path} does not exist")
        return
        
    uri = "ws://localhost:8080/ws"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Wait for connection message
            response = await websocket.recv()
            print("Connection response:", response)
            
            # Send WAV file and handle responses
            await send_wav_file(websocket, wav_path)
            
    except ConnectionRefusedError:
        print("Failed to connect. Make sure the server is running.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())