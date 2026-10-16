namespace NzbDrone.Core.MediaFiles.BookImport
{
    // What a user asked for when retrying a download's import from the queue
    public class DownloadImportOptions
    {
        // Import the files even when they aren't a close enough match for the book
        public bool IgnoreMatchThreshold { get; set; }

        // Set aside a file already at an import's destination, rather than failing on it
        public bool ReplaceDestination { get; set; }
    }
}
