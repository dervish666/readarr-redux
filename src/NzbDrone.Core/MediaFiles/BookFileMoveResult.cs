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

        // What a rollback needs if the new rows then fail to save: where the new file came from, how it got here,
        // and the row of another book's file that was in its way, which UpgradeBookFile has already deleted
        public string SourcePath { get; set; }
        public bool CopyOnly { get; set; }
        public bool IsCalibre { get; set; }
        public BookFile DisplacedFile { get; set; }
    }

    public class SetAsideBookFile
    {
        public string OriginalPath { get; set; }
        public string Path { get; set; }
        public string RecycleBinSubfolder { get; set; }
    }
}
