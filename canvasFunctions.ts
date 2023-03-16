import * as utils from './utils'

export function extractFrame(image: HTMLImageElement, frameWidth: number, frameHeight: number, frameIndex: number): ImageData | null {
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')
    if (!context) return null;

    let gridWidth = Math.round(image.naturalWidth / frameWidth)
    let gridX = frameIndex % gridWidth
    let gridY = Math.floor(frameIndex / gridWidth)
    context.drawImage(
        image,
        gridX * frameWidth, gridY * frameHeight,
        frameWidth, frameHeight,
        0, 0,
        frameWidth, frameHeight,
    );
    return context.getImageData(0, 0, frameWidth, frameHeight)
}

export function ditherData(imageData: ImageData, randomness: number, percentage: number, x: number, y: number, frameWidth: number, frameHeight: number): ImageData {
    let rv = new ImageData(frameWidth * 3, frameHeight * 3)
    let m = Math.round(1 / percentage)
    let r = Math.floor(randomness * m)
    for (let i = 0; i < frameWidth; i++) {
        for (let j = 0; j < frameHeight; j++) {
            if (utils.negativeSafeModulo(i + x + (j + y) * 2 + r, m) !== 0) {
                // TODO: use priority mask here
                continue
            }
            let imageIndex = (j * frameWidth + i) * 4
            let middlePixelIndex = ((j * 3 + 1) * rv.width + i * 3 + 1) * 4;
            rv.data[middlePixelIndex] = imageData.data[imageIndex];
            rv.data[middlePixelIndex + 1] = imageData.data[imageIndex + 1];
            rv.data[middlePixelIndex + 2] = imageData.data[imageIndex + 2];
            rv.data[middlePixelIndex + 3] = imageData.data[imageIndex + 3];
        }
    }
    return rv
}