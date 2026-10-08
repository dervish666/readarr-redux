using System.Collections.Generic;

namespace NzbDrone.Core.MediaFiles
{
    public class BookFileMoveResult
    {
        public BookFileMoveResult()
        {
            OldFiles = new List<BookFile>();
            SetAsideFiles = new List<SetAsideBookFile>();
        }

        public BookFile BookFile { get; set; }
        public List<BookFile> OldFiles { get; set; }
        public List<SetAsideBookFile> SetAsideFiles { get; set; }
    }

    public class SetAsideBookFile
    {
        public string OriginalPath { get; set; }
        public string Path { get; set; }
        public string RecycleBinSubfolder { get; set; }
    }
}
