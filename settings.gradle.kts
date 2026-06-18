pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "MuditaAudiobookPlayer"

include(":app")

// Consume the Mudita Mindful Design library straight from source as a composite build.
// Gradle auto-substitutes the `com.mudita:MMD` dependency with the local :mmd-core project,
// so MMD-master stays untouched and we always compile against the real components.
includeBuild("MMD-master")
