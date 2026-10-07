using System;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Core.Update;

namespace NzbDrone.Core.Test.UpdateTests
{
    public class UpdatePackageProviderFixture : CoreTest<UpdatePackageProvider>
    {
        [Test]
        public void should_never_offer_an_update()
        {
            Subject.GetLatestUpdate("develop", new Version(0, 1)).Should().BeNull();
        }

        [Test]
        public void should_never_return_recent_updates()
        {
            Subject.GetRecentUpdates("develop", new Version(0, 1), null).Should().BeEmpty();
        }
    }
}
