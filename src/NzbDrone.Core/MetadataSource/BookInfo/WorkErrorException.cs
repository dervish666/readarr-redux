namespace NzbDrone.Core.MetadataSource.BookInfo
{
    // The metadata source rejected this work rather than failing as a whole. rreading-glasses answers 500 "Book is
    // invalid" for the same few works on every lookup, so this marks a bad work, not a struggling source.
    public class WorkErrorException : BookInfoException
    {
        public WorkErrorException(string foreignBookId, string response)
            : base("Metadata source failed on work {0}: {1}", foreignBookId, response)
        {
        }
    }
}
