namespace NzbDrone.Core.MediaFiles.BookImport.Identification
{
    // How closely a release's book title names one candidate book. A rescan keeps one per candidate edition it
    // tried, so it can tell a match from a guess between several books.
    public class TitleMatch
    {
        public string ForeignBookId { get; set; }
        public string Title { get; set; }
        public double Distance { get; set; }
        public double LooseDistance { get; set; }

        // The files carry an ISBN, ASIN or Goodreads id this edition has
        public bool SharesIdentifier { get; set; }
    }
}
