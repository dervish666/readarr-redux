namespace NzbDrone.Core.MetadataSource.BookInfo
{
    // The metadata source answered a work with a server error of its own, not a rate limit or gateway error.
    // rreading-glasses answers 500 "Book is invalid" for the same few works on every lookup, so this marks a bad work
    // rather than a struggling source.
    public class WorkErrorException : BookInfoException
    {
        public WorkErrorException(string foreignBookId, string response)
            : base("Metadata source failed on work {0}: {1}", foreignBookId, response)
        {
        }
    }
}
